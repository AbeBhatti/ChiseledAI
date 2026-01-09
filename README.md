Chiseled AI

Chiseled AI is a computer vision–based workout application that uses your camera to track exercises, count reps, and give real-time feedback on your form. This is an MVP for push ups, pull ups, and sit ups, but can be applied to a wide variety of exercises.

There is also a "Ping Pong" mode that allows you to play ping pong against the computer by doing "reps", meant to give you a quick workout and also track progress in a different, more challenging way.

The goal of the project is to combine fitness and AI in a practical way by using pose detection and movement analysis to understand how exercises are being performed.

Features

Real-time camera-based exercise tracking
Automatic rep counting
Exercise state detection
Form and movement feedback (using text to speech)
Web-based interface

Tech Stack:
Python, Flask, OpenCV, MediaPipe, React

How It Works

The camera captures live video frames which are processed by a computer vision model to detect body landmarks. Using a series of helper functions and algorithms, your form is analyzed and feedback is sent to the frontend in real time based on rep duration, angles, and more. 