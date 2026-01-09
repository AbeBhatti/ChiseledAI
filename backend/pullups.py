import time
from collections import deque
from utils import angle_3d, avg, ValueSmoother
from config import *

TARGET_HIP_ANGLE = 155
HIP_TOLERANCE = 18


class PullUpTracker:
    def __init__(self):
        self.state = "idle"
        self.motion_state = "down"
        self.rep_count = 0
        self.reps = []
        self.current_rep = None
        self.out_of_position_start = None
        self.last_transition_time = 0
        self.elbow_smoother = ValueSmoother(SMOOTHING_WINDOW)
        self.shoulder_smoother = ValueSmoother(SMOOTHING_WINDOW)
        self.hip_positions = deque(maxlen=5)
        self.kipping_frames = 0
        self.baseline_shoulder_y = None
        self.baseline_set_time = None

    def start(self):
        self.state = "active"
        self.motion_state = "down"
        self.rep_count = 0
        self.reps = []
        self.current_rep = None
        self.out_of_position_start = None
        self.last_transition_time = time.time()
        self.elbow_smoother.clear()
        self.shoulder_smoother.clear()
        self.hip_positions.clear()
        self.kipping_frames = 0
        self.baseline_shoulder_y = None
        self.baseline_set_time = None

    def stop(self):
        self.state = "idle"
        full_reps = sum(1 for r in self.reps if r["quality"] == "full")
        good_reps = sum(1 for r in self.reps if r["quality"] == "good")
        partial_reps = sum(1 for r in self.reps if r["quality"] == "partial")
        poor_reps = sum(1 for r in self.reps if r["quality"] == "poor")
        avg_score = sum(r["score"] for r in self.reps) / len(self.reps) if self.reps else 0
        avg_duration = sum(r["duration"] for r in self.reps) / len(self.reps) if self.reps else 0

        all_flags = []
        for rep in self.reps:
            all_flags.extend(rep["flags"])

        flag_counts = {}
        for flag in all_flags:
            flag_counts[flag] = flag_counts.get(flag, 0) + 1

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

    def in_pullup_position(self, landmarks):
        ls = landmarks[11]
        rs = landmarks[12]
        lw = landmarks[15]
        rw = landmarks[16]
        shoulder_y = avg(ls.y, rs.y)
        left_ok = lw.y < shoulder_y - 0.05
        right_ok = rw.y < shoulder_y - 0.05
        return left_ok or right_ok

    def get_elbow_angle(self, landmarks):
        ls, le, lw = landmarks[11], landmarks[13], landmarks[15]
        rs, re, rw = landmarks[12], landmarks[14], landmarks[16]
        return avg(angle_3d(ls, le, lw), angle_3d(rs, re, rw))

    def get_chin_clearance(self, landmarks):
        nose = landmarks[0]
        lw, rw = landmarks[15], landmarks[16]
        return nose.y - avg(lw.y, rw.y)

    def get_body_alignment(self, landmarks):
        ls = landmarks[11]
        lh, lk, la = landmarks[23], landmarks[25], landmarks[27]
        hip_angle = angle_3d(ls, lh, lk)
        knee_angle = angle_3d(lh, lk, la)
        return hip_angle, knee_angle

    def detect_kipping(self, landmarks):
        lh, rh = landmarks[23], landmarks[24]
        hip_x = avg(lh.x, rh.x)
        self.hip_positions.append(hip_x)

        if len(self.hip_positions) >= 3:
            velocity = abs(self.hip_positions[-1] - self.hip_positions[-3])
            if velocity > MAX_HIP_VELOCITY:
                self.kipping_frames += 1
            else:
                self.kipping_frames = max(0, self.kipping_frames - 1)

        return self.kipping_frames >= KIPPING_THRESHOLD

    def update(self, landmarks):
        if self.state != "active":
            return True

        elbow_angle = self.elbow_smoother.add(self.get_elbow_angle(landmarks))
        ls, rs = landmarks[11], landmarks[12]
        lw, rw = landmarks[15], landmarks[16]
        shoulder_y = self.shoulder_smoother.add(avg(ls.y, rs.y))

        if self.baseline_shoulder_y is None:
            if abs(lw.y - rw.y) < 0.05 and elbow_angle > 140:
                self.baseline_shoulder_y = shoulder_y
                self.baseline_set_time = time.time()
            return True

        if time.time() - self.baseline_set_time >= 3.0:
            if not self.in_pullup_position(landmarks):
                if self.out_of_position_start is None:
                    self.out_of_position_start = time.time()
                elif time.time() - self.out_of_position_start >= 1.5:
                    self.stop()
                    return True
            else:
                self.out_of_position_start = None

        hip_angle, knee_angle = self.get_body_alignment(landmarks)
        is_kipping = self.detect_kipping(landmarks)

        current_time = time.time()
        time_since_transition = current_time - self.last_transition_time

        wrist_y = avg(lw.y, rw.y)
        arm_length = abs(shoulder_y - wrist_y)
        pull_threshold = arm_length * 0.35

        if self.motion_state == "down" and shoulder_y < self.baseline_shoulder_y - pull_threshold:
            if time_since_transition > PULLUP_MIN_REP_DURATION:
                self.motion_state = "up"
                self.last_transition_time = current_time
                self.current_rep = {
                    "start_time": current_time,
                    "min_shoulder_y": shoulder_y,
                    "start_shoulder_y": shoulder_y,
                    "min_elbow_angle": elbow_angle,
                    "max_elbow_angle": elbow_angle,
                    "min_chin_clearance": 999,
                    "min_hip_angle": hip_angle,
                    "max_hip_angle": hip_angle,
                    "kipped": False,
                    "flags": []
                }

        elif self.motion_state == "up" and self.current_rep:
            self.current_rep["min_shoulder_y"] = min(self.current_rep["min_shoulder_y"], shoulder_y)
            self.current_rep["min_elbow_angle"] = min(self.current_rep["min_elbow_angle"], elbow_angle)
            self.current_rep["max_elbow_angle"] = max(self.current_rep["max_elbow_angle"], elbow_angle)

            chin_clearance = self.get_chin_clearance(landmarks)
            self.current_rep["min_chin_clearance"] = min(
                self.current_rep["min_chin_clearance"], chin_clearance
            )

            self.current_rep["min_hip_angle"] = min(self.current_rep["min_hip_angle"], hip_angle)
            self.current_rep["max_hip_angle"] = max(self.current_rep["max_hip_angle"], hip_angle)

            if is_kipping:
                self.current_rep["kipped"] = True

            drop_from_peak = shoulder_y - self.current_rep["min_shoulder_y"]
            drop_threshold = arm_length * 0.30
            close_to_baseline = abs(shoulder_y - self.baseline_shoulder_y) < (arm_length * 0.15)

            if drop_from_peak > drop_threshold and close_to_baseline:
                if time_since_transition > PULLUP_MIN_REP_DURATION:
                    self.complete_rep(current_time)

        return True

    def complete_rep(self, current_time):
        self.motion_state = "down"
        self.last_transition_time = current_time
        self.rep_count += 1
        rep = self.current_rep

        rep["rep_id"] = self.rep_count
        rep["end_time"] = current_time
        rep["duration"] = current_time - rep["start_time"]
        rep["pull_height"] = rep["start_shoulder_y"] - rep["min_shoulder_y"]
        rep["rom"] = rep["max_elbow_angle"] - rep["min_elbow_angle"]

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
        self.kipping_frames = 0

    def score(self, rep):
        score = 100

        if rep["duration"] < 0.8:
            score -= 25
            rep["flags"].append("too fast")
        elif rep["duration"] < 1.2:
            score -= 10
            rep["flags"].append("too fast")

        if rep["pull_height"] < 0.05:
            score -= 35
            rep["flags"].append("go higher")
        elif rep["pull_height"] < 0.08:
            score -= 15
            rep["flags"].append("go a little higher")

        if rep["min_chin_clearance"] > 0.18:
            score -= 20
            rep["flags"].append("chin all the way up")
        elif rep["min_chin_clearance"] > 0.10:
            score -= 10
            rep["flags"].append("chin more up")

        if rep["rom"] < 45:
            score -= 15
            rep["flags"].append("bend elbows more")
        elif rep["rom"] < 65:
            score -= 8
            rep["flags"].append("bend elbows")

        if rep["kipped"]:
            score -= 8
            rep["flags"].append("dont swing")

        if (
            rep["min_hip_angle"] < TARGET_HIP_ANGLE - HIP_TOLERANCE or
            rep["max_hip_angle"] > TARGET_HIP_ANGLE + HIP_TOLERANCE
        ):
            score -= 10
            rep["flags"].append("keep_back_straight")

        return max(score, 0)
