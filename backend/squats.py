import time
from utils import angle_3d, avg, ValueSmoother
from config import *

class SquatTracker:
    def __init__(self):
        self.state = "idle"
        self.motion_state = "up"
        self.rep_count = 0
        self.reps = []
        self.current_rep = None
        self.last_transition_time = 0
        self.out_of_position_start = None
        self.knee_smoother = ValueSmoother(SMOOTHING_WINDOW)
        self.hip_angle_smoother = ValueSmoother(SMOOTHING_WINDOW)
        self.hip_x_smoother = ValueSmoother(SMOOTHING_WINDOW)
        self.standing_hip_y = None

    def start(self):
        self.state = "active"
        self.motion_state = "up"
        self.rep_count = 0
        self.reps = []
        self.current_rep = None
        self.last_transition_time = time.time()
        self.out_of_position_start = None
        self.standing_hip_y = None
        self.knee_smoother.clear()
        self.hip_angle_smoother.clear()
        self.hip_x_smoother.clear()

    def stop(self):
        self.state = "idle"
        full = sum(1 for r in self.reps if r["quality"] == "full")
        good = sum(1 for r in self.reps if r["quality"] == "good")
        partial = sum(1 for r in self.reps if r["quality"] == "partial")
        poor = sum(1 for r in self.reps if r["quality"] == "poor")
        avg_score = sum(r["score"] for r in self.reps) / len(self.reps) if self.reps else 0
        avg_duration = sum(r["duration"] for r in self.reps) / len(self.reps) if self.reps else 0
        flags = []
        for r in self.reps:
            flags.extend(r["flags"])
        flag_counts = {}
        for f in flags:
            flag_counts[f] = flag_counts.get(f, 0) + 1
        return {
            "total_reps": self.rep_count,
            "full_reps": full,
            "good_reps": good,
            "partial_reps": partial,
            "poor_reps": poor,
            "avg_score": round(avg_score, 1),
            "avg_duration": round(avg_duration, 2),
            "common_issues": sorted(flag_counts.items(), key=lambda x: x[1], reverse=True)[:3],
            "reps_data": self.reps,
        }

    def get_knee_angle(self, landmarks):
        lh, lk, la = landmarks[23], landmarks[25], landmarks[27]
        rh, rk, ra = landmarks[24], landmarks[26], landmarks[28]
        left = angle_3d(lh, lk, la)
        right = angle_3d(rh, rk, ra)
        return avg(left, right)

    def get_hip_angle(self, landmarks):
        ls = landmarks[11]
        lh, lk = landmarks[23], landmarks[25]
        return angle_3d(ls, lh, lk)

    def update(self, landmarks):
        if self.state != "active":
            return
        ls, rs = landmarks[11], landmarks[12]
        lh, rh = landmarks[23], landmarks[24]
        hip_y = avg(lh.y, rh.y)
        hip_x = self.hip_x_smoother.add(avg(lh.x, rh.x))
        shoulder_x = avg(ls.x, rs.x)
        knee_angle = self.knee_smoother.add(self.get_knee_angle(landmarks))
        hip_angle = self.hip_angle_smoother.add(self.get_hip_angle(landmarks))
        if self.standing_hip_y is None:
            if knee_angle > 165:
                self.standing_hip_y = hip_y
            return
        current_time = time.time()
        time_since_transition = current_time - self.last_transition_time
        if self.motion_state == "up" and knee_angle < SQUAT_DOWN_ANGLE:
            if time_since_transition > SQUAT_MIN_REP_DURATION:
                self.motion_state = "down"
                self.last_transition_time = current_time
                self.current_rep = {
                    "start_time": current_time,
                    "start_hip_y": hip_y,
                    "min_hip_y": hip_y,
                    "start_hip_x": hip_x,
                    "max_hip_back": 0.0,
                    "min_knee_angle": knee_angle,
                    "min_hip_angle": hip_angle,
                    "max_hip_angle": hip_angle,
                    "flags": [],
                }
        elif self.motion_state == "down" and self.current_rep:
            rep = self.current_rep
            rep["min_knee_angle"] = min(rep["min_knee_angle"], knee_angle)
            rep["min_hip_y"] = min(rep["min_hip_y"], hip_y)
            rep["min_hip_angle"] = min(rep["min_hip_angle"], hip_angle)
            rep["max_hip_angle"] = max(rep["max_hip_angle"], hip_angle)
            hip_back = abs(hip_x - rep["start_hip_x"])
            rep["max_hip_back"] = max(rep["max_hip_back"], hip_back)
            rep_completed = False
            if self.motion_state == "down" and self.current_rep:
                if time_since_transition > SQUAT_MIN_REP_DURATION:
                    if knee_angle > SQUAT_UP_ANGLE:
                        rep_completed = True
                    elif knee_angle > SQUAT_UP_ANGLE * 0.7:
                        rep_completed = True
                        self.current_rep["partial_top"] = SQUAT_UP_ANGLE - knee_angle
            if rep_completed:
                self.complete_rep(current_time)

    def complete_rep(self, current_time):
        self.motion_state = "up"
        self.last_transition_time = current_time
        self.rep_count += 1
        rep = self.current_rep
        rep["rep_id"] = self.rep_count
        rep["end_time"] = current_time
        rep["duration"] = current_time - rep["start_time"]
        rep["depth"] = rep["start_hip_y"] - rep["min_hip_y"]
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
        self.current_rep = None

    def score(self, rep):
        score = 100
        if rep["depth"] < SQUAT_MIN_DEPTH * 0.6:
            score -= 35
            rep["flags"].append("go lower")
        elif rep["depth"] < SQUAT_MIN_DEPTH:
            score -= 15
            rep["flags"].append("a little lower")
        if rep["min_knee_angle"] > 120:
            score -= 20
            rep["flags"].append("bend knees more")
        if rep["max_hip_back"] < SQUAT_MIN_HIP_BACK:
            score -= 25
            rep["flags"].append("stick out butt")
        if rep["max_hip_angle"] > SQUAT_MAX_HIP_ANGLE:
            score -= 10
            rep["flags"].append("keep back straight")
        if rep["duration"] < SQUAT_MIN_REP_DURATION + 0.2:
            score -= 10
            rep["flags"].append("too_fast")
        return max(score, 0)