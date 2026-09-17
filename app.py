import json
import os
import re
from datetime import datetime
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DATA_FILE = os.path.join(DATA_DIR, "students.json")

# Ensure the data folder and file exist
os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, "w") as f:
        json.dump([], f, indent=2)

# -------------------------------------------------------------
# JSON Helper Functions
# -------------------------------------------------------------
def read_students():
    """Reads and returns the list of students from the JSON file."""
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def write_students(students):
    """Writes the updated student list to the JSON file."""
    with open(DATA_FILE, "w") as f:
        json.dump(students, f, indent=2)

# -------------------------------------------------------------
# Server-side Validation
# -------------------------------------------------------------
def validate_student(data):
    errors = []
    name = str(data.get("name", "")).strip()
    roll_no = str(data.get("roll_number", "")).strip()
    email = str(data.get("email", "")).strip()
    dept = str(data.get("department", "")).strip()
    year = data.get("year_of_study")
    gpa = data.get("gpa")

    if not name or len(name) < 2:
        errors.append("Name is required and must be at least 2 characters.")

    if not roll_no:
        errors.append("Roll number is required.")

    email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    if not email:
        errors.append("Email is required.")
    elif not re.match(email_regex, email):
        errors.append("Invalid email address format.")

    if not dept:
        errors.append("Department is required.")

    try:
        year_val = int(year)
        if year_val < 1 or year_val > 5:
            errors.append("Year of study must be between 1 and 5.")
    except (ValueError, TypeError):
        errors.append("Year of study must be a valid integer.")

    if gpa is not None and str(gpa).strip() != "":
        try:
            gpa_val = float(gpa)
            if gpa_val < 0.0 or gpa_val > 10.0:
                errors.append("GPA must be between 0.00 and 10.00.")
        except (ValueError, TypeError):
            errors.append("GPA must be a valid number.")

    return errors

# -------------------------------------------------------------
# UI Route
# -------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")

# -------------------------------------------------------------
# REST API Endpoints
# -------------------------------------------------------------

# 1. READ ALL & SEARCH: GET /api/students
@app.route("/api/students", methods=["GET"])
def get_students():
    search = request.args.get("search", "").strip().lower()
    students = read_students()

    if search:
        filtered = [
            s for s in students
            if search in s["name"].lower()
            or search in s["roll_number"].lower()
            or search in s["department"].lower()
        ]
        return jsonify({"success": True, "count": len(filtered), "data": filtered}), 200

    return jsonify({"success": True, "count": len(students), "data": students}), 200

# 2. READ ONE: GET /api/students/<id>
@app.route("/api/students/<int:student_id>", methods=["GET"])
def get_student(student_id):
    students = read_students()
    student = next((s for s in students if s["id"] == student_id), None)
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404
    return jsonify({"success": True, "data": student}), 200

# 3. CREATE: POST /api/students
@app.route("/api/students", methods=["POST"])
def create_student():
    data = request.get_json() or {}
    errors = validate_student(data)
    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    students = read_students()
    roll_no = data["roll_number"].strip()
    email = data["email"].strip().lower()

    # Check for duplicate roll number or email
    for s in students:
        if s["roll_number"].lower() == roll_no.lower():
            return jsonify({"success": False, "message": "Roll Number already exists."}), 409
        if s["email"].lower() == email:
            return jsonify({"success": False, "message": "Email already exists."}), 409

    # Generate sequential unique ID
    new_id = max([s["id"] for s in students], default=0) + 1

    new_student = {
        "id": new_id,
        "roll_number": roll_no,
        "name": data["name"].strip(),
        "email": email,
        "department": data["department"].strip(),
        "year_of_study": int(data["year_of_study"]),
        "gpa": float(data.get("gpa") or 0.0),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    students.insert(0, new_student)  # Show newest first
    write_students(students)

    return jsonify({
        "success": True,
        "message": "Student created successfully.",
        "student_id": new_id
    }), 201

# 4. UPDATE: PUT /api/students/<id>
@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.get_json() or {}
    errors = validate_student(data)
    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    students = read_students()
    target_index = next((i for i, s in enumerate(students) if s["id"] == student_id), None)

    if target_index is None:
        return jsonify({"success": False, "message": "Student not found."}), 404

    roll_no = data["roll_number"].strip()
    email = data["email"].strip().lower()

    # Verify uniqueness against other records
    for i, s in enumerate(students):
        if i != target_index:
            if s["roll_number"].lower() == roll_no.lower():
                return jsonify({"success": False, "message": "Roll Number is used by another student."}), 409
            if s["email"].lower() == email:
                return jsonify({"success": False, "message": "Email is used by another student."}), 409

    # Update record
    students[target_index]["roll_number"] = roll_no
    students[target_index]["name"] = data["name"].strip()
    students[target_index]["email"] = email
    students[target_index]["department"] = data["department"].strip()
    students[target_index]["year_of_study"] = int(data["year_of_study"])
    students[target_index]["gpa"] = float(data.get("gpa") or 0.0)

    write_students(students)
    return jsonify({"success": True, "message": "Student updated successfully."}), 200

# 5. DELETE: DELETE /api/students/<id>
@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    students = read_students()
    new_students = [s for s in students if s["id"] != student_id]

    if len(new_students) == len(students):
        return jsonify({"success": False, "message": "Student not found."}), 404

    write_students(new_students)
    return jsonify({"success": True, "message": "Student deleted successfully."}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)