import cv2
import mediapipe as mp
import base64
import numpy as np
from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from pushups import PushUpTracker
from pullups import PullUpTracker
from squats import SquatTracker
from utils import avg
from config import MIN_HIP_ANGLE, MIN_KNEE_ANGLE, PULLUP_MIN_HIP_ANGLE, PULLUP_MIN_KNEE_ANGLE

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
)

pushup_tracker = PushUpTracker()
pullup_tracker = PullUpTracker()
squat_tracker = SquatTracker()

trackers = {
    "pushups": pushup_tracker,
    "pullups": pullup_tracker,
    "squats" : squat_tracker,
}

current_exercise = None
tracker = None

@socketio.on("connect")
def handle_connect():
    print("Client connected")

@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")

@socketio.on("select_exercise")
def handle_select_exercise(data):
    global current_exercise, tracker
    current_exercise = data.get("exercise")
    tracker = trackers.get(current_exercise)
    if tracker:
        tracker.start()
        print(f"Exercise selected: {current_exercise}")
        emit("exercise_selected", {"exercise": current_exercise})
    else:
        print(f"Invalid exercise: {current_exercise}")
        emit("error", {"message": "Invalid exercise"})

@socketio.on("end_workout")
def handle_end_workout():
    global tracker
    if tracker:
        print("Ending workout and sending summary...")
        summary = tracker.stop()
        emit("workout_summary", summary)
    else:
        print("No active tracker to end")

@socketio.on("video_frame")
def handle_video_frame(data):
    global tracker, current_exercise
    if tracker is None:
        return
    try:
        frame_str = data.get("frame", "")
        if not frame_str:
            return
        img_data = base64.b64decode(frame_str.split(",")[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return
    except Exception as e:
        print(f"Error decoding frame: {e}")
        return

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb)

    landmark_list = []
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        tracker.update(landmarks)
        landmark_list = [
            {"x": l.x, "y": l.y, "visibility": l.visibility}
            for l in landmarks
        ]

    feedback = ""
    if tracker.reps:
        last_rep = tracker.reps[-1]
        flags = last_rep.get("flags") or []
        if flags:
            feedback = ", ".join(flags)

    emit(
        "update",
        {
            "rep_count": tracker.rep_count,
            "feedback": feedback,
            "landmarks": landmark_list,
        },
    )

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8765)