import time
from utils import angle_3d, avg, ValueSmoother
from config import *

class PushUpTracker:
    def __init__(self):
        self.state = "idle"
        self.motion_state = "up"
        self.rep_count = 0
        self.reps = []
        self.current_rep = None
        self.out_of_position_start = None
        self.last_transition_time = 0
        self.elbow_smoother = ValueSmoother(SMOOTHING_WINDOW)
        self.shoulder_smoother = ValueSmoother(SMOOTHING_WINDOW)
        self.initial_shoulder_y = None

    def start(self):
        self.state = "active"
        self.motion_state = "up"
        self.rep_count = 0
        self.reps = []
        self.current_rep = None
        self.out_of_position_start = None
        self.last_transition_time = time.time()
        self.initial_shoulder_y = None
        self.elbow_smoother.clear()
        self.shoulder_smoother.clear()

    def stop(self):
        self.state = "idle"

        full_reps = sum(1 for r in self.reps if r.get("quality") == "full")
        good_reps = sum(1 for r in self.reps if r.get("quality") == "good")
        partial_reps = sum(1 for r in self.reps if r.get("quality") == "partial")
        poor_reps = sum(1 for r in self.reps if r.get("quality") == "poor")

        avg_score = (
            sum(r["score"] for r in self.reps) / len(self.reps)
            if self.reps else 0
        )

        avg_duration = (
            sum(r["duration"] for r in self.reps) / len(self.reps)
            if self.reps else 0
        )

        all_flags = []
        for r in self.reps:
            all_flags.extend(r["flags"])

        flag_counts = {}
        for f in all_flags:
            flag_counts[f] = flag_counts.get(f, 0) + 1

        return {
            "total_reps": self.rep_count,
            "full_reps": full_reps,
            "good_reps": good_reps,
            "partial_reps": partial_reps,
            "poor_reps": poor_reps,
            "avg_score": round(avg_score, 1),
            "avg_duration": round(avg_duration, 2),
            "common_issues": sorted(flag_counts.items(), key=lambda x: x[1], reverse=True)[:3],
            "reps_data": self.reps
        }


    def get_session_data(self):
        return {
            "total_reps": self.rep_count,
            "reps_data": self.reps
        }

    def in_pushup_position(self, landmarks):
        ls = landmarks[11]
        rs = landmarks[12]
        lh = landmarks[23]
        rh = landmarks[24]
        lk = landmarks[25]

        hip_angle = angle_3d(ls, lh, lk)
        shoulder_y = avg(ls.y, rs.y)
        hip_y = avg(lh.y, rh.y)

        return (
            hip_angle > 140 and
            shoulder_y > 0.3 and
            abs(shoulder_y - hip_y) < 0.3
        )

    def get_elbow_angle(self, landmarks):
        ls, le, lw = landmarks[11], landmarks[13], landmarks[15]
        rs, re, rw = landmarks[12], landmarks[14], landmarks[16]
        return avg(
            angle_3d(ls, le, lw),
            angle_3d(rs, re, rw)
        )

    def get_body_alignment(self, landmarks):
        ls = landmarks[11]
        lh, lk, la = landmarks[23], landmarks[25], landmarks[27]
        hip_angle = angle_3d(ls, lh, lk)
        knee_angle = angle_3d(lh, lk, la)
        return hip_angle, knee_angle

    def update(self, landmarks):
        if self.state != "active":
            return

        if not self.in_pushup_position(landmarks):
            if self.out_of_position_start is None:
                self.out_of_position_start = time.time()
            elif time.time() - self.out_of_position_start >= OUT_OF_POSITION_TIMEOUT:
                print("ℹ️ SESSION STOPPED (out of position)")
                self.stop()
                return
        else:
            self.out_of_position_start = None

        elbow_angle = self.elbow_smoother.add(self.get_elbow_angle(landmarks))
        ls, rs = landmarks[11], landmarks[12]
        shoulder_y = self.shoulder_smoother.add(avg(ls.y, rs.y))

        if self.initial_shoulder_y is None:
            self.initial_shoulder_y = shoulder_y

        hip_angle, knee_angle = self.get_body_alignment(landmarks)
        current_time = time.time()
        time_since_transition = current_time - self.last_transition_time

        if self.motion_state == "up" and elbow_angle < ELBOW_DOWN_ANGLE + 10:
            if time_since_transition > MIN_REP_DURATION:
                self.motion_state = "down"
                self.last_transition_time = current_time
                self.current_rep = {
                    "start_time": current_time,
                    "min_elbow_angle": elbow_angle,
                    "max_elbow_angle": elbow_angle,
                    "start_shoulder_y": shoulder_y,
                    "max_shoulder_y": shoulder_y,
                    "min_hip_angle": hip_angle,
                    "max_hip_angle": hip_angle,
                    "min_knee_angle": knee_angle,
                    "flags": []
                }
                print(f"\n⬇️ DOWN | elbow={elbow_angle:.1f} hip={hip_angle:.1f}")

        elif self.motion_state == "down" and self.current_rep:
            self.current_rep["min_elbow_angle"] = min(self.current_rep["min_elbow_angle"], elbow_angle)
            self.current_rep["max_elbow_angle"] = max(self.current_rep["max_elbow_angle"], elbow_angle)
            self.current_rep["max_shoulder_y"] = max(self.current_rep["max_shoulder_y"], shoulder_y)
            self.current_rep["min_hip_angle"] = min(self.current_rep["min_hip_angle"], hip_angle)
            self.current_rep["max_hip_angle"] = max(self.current_rep["max_hip_angle"], hip_angle)
            self.current_rep["min_knee_angle"] = min(self.current_rep["min_knee_angle"], knee_angle)

            if elbow_angle > ELBOW_UP_ANGLE - 5:
                if time_since_transition > MIN_REP_DURATION:
                    self.complete_rep(current_time)

    def complete_rep(self, current_time):
        self.motion_state = "up"
        self.last_transition_time = current_time
        self.rep_count += 1
        
        rep = self.current_rep
        rep["rep_id"] = self.rep_count
        rep["end_time"] = current_time
        rep["duration"] = current_time - rep["start_time"]
        rep["descent_depth"] = rep["max_shoulder_y"] - rep["start_shoulder_y"]
        
        rep["score"] = self.score(rep)
        
        if rep["score"] >= 90:
            rep["quality"] = "full"
        elif rep["score"] >= 70:
            rep["quality"] = "good"
        elif rep["score"] >= 50:
            rep["quality"] = "partial"
        else:
            rep["quality"] = "poor"
        
        self.reps.append(rep)
        print(f"✅ Rep #{rep['rep_id']} complete! Score: {rep['score']}/100 ({rep['quality']})")
        self.current_rep = None

    def score(self, rep):
        score = 100

        if rep["min_elbow_angle"] > ELBOW_DOWN_ANGLE + 10:
            score -= 50
            rep["flags"].append("much lower")
        elif rep["min_elbow_angle"] > ELBOW_DOWN_ANGLE + 5:
            score -= 35
            rep["flags"].append("go lower")
        elif rep["min_elbow_angle"] > ELBOW_DOWN_ANGLE:
            score -= 20
            rep["flags"].append("a little lower")
        elif rep["min_elbow_angle"] > ELBOW_DOWN_ANGLE - 10:
            score -= 10
            rep["flags"].append("a little lower")

        if rep["descent_depth"] < SHALLOW_THRESHOLD:
            score -= 20
            rep["flags"].append("low movement")

        if (
            rep["min_hip_angle"] < TARGET_HIP_ANGLE - HIP_TOLERANCE or
            rep["max_hip_angle"] > TARGET_HIP_ANGLE + HIP_TOLERANCE
        ):
            score -= 15
            rep["flags"].append("Back bent")


        if rep["min_knee_angle"] < MIN_KNEE_ANGLE:
            score -= 10
            rep["flags"].append("legs bent")

        if rep["duration"] < MIN_REP_DURATION:
            score -= 10
            rep["flags"].append("too fast")

        return max(score, 0)
