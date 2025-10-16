---
trigger: always_on
---

{
  "windsurf_rules": [
    {
      "name": "Single Active Session Rule",
      "description": "Each user (Registrar, Faculty, or Student) is allowed only one active session at a time.",
      "logic": [
        "When user logs in, system checks for active session.",
        "If active session exists, deny new login or terminate previous session based on config.",
        "Session token must be unique per user.",
        "Session is destroyed on logout or timeout."
      ],
      "enforcement": [
        "Strictly deny multiple logins per account.",
        "Use session token validation before page access.",
        "Notify user if login attempt fails due to active session."
      ],
      "applies_to": ["Registrar", "Faculty", "Student"]
    },
    {
      "name": "Enrollment Semester Structure Rule",
      "description": "Enrollment is divided per semester with a 10-month academic year: 1st Semester (1st & 2nd Quarter), 2nd Semester (3rd & 4th Quarter).",
      "logic": [
        "Enrollment for 1st semester occurs before school year starts.",
        "Enrollment for 2nd semester occurs after 2nd Quarter ends.",
        "Each semester has its own enrollment period and deadlines.",
        "Students cannot enroll in multiple semesters at the same time."
      ],
      "enforcement": [
        "Lock enrollment form when semester is closed.",
        "Allow only one active enrollment record per student per semester.",
        "Notify student when enrollment period is open or closed."
      ],
      "applies_to": ["Student", "Registrar"]
    },
    {
      "name": "Grade 11 and 12 Enrollment Rule",
      "description": "New Grade 11, continuing Grade 12, and Transferee students follow different enrollment flows.",
      "logic": [
        "New Grade 11 must complete registration and choose strand.",
        "Grade 12 students must confirm data before continuing enrollment.",
        "Transferees require coordinator evaluation before approval.",
        "Registrar has final approval authority."
      ],
      "enforcement": [
        "Block strand changes after approval.",
        "Enrollment must be approved before subjects are assigned.",
        "Transferee record must be reviewed by coordinator before registrar approval."
      ],
      "applies_to": ["Student", "Registrar", "Coordinator"]
    },
    {
      "name": "Coordinator Transferee Evaluation Rule",
      "description": "Coordinators must evaluate transferee records, credit subjects, and input grades before registrar finalizes enrollment.",
      "logic": [
        "Coordinator views transferee’s previous school record.",
        "Coordinator selects 'Credit' or 'Not Credit' per subject.",
        "Coordinator inputs grade for credited subjects.",
        "Coordinator recommends strand and year level.",
        "Registrar reviews and approves enrollment after evaluation."
      ],
      "enforcement": [
        "Evaluation must be completed before registrar can approve transferee enrollment.",
        "Uncredited subjects are automatically added to student load.",
        "All evaluations are logged with timestamps."
      ],
      "applies_to": ["Coordinator", "Registrar"]
    },
    {
      "name": "Faculty Load Limit Rule",
      "description": "Each faculty member is allowed a maximum of 5 teaching loads per semester.",
      "logic": [
        "Registrar assigns subject-section loads.",
        "System counts total loads assigned to faculty.",
        "If total exceeds 5, assignment is blocked.",
        "Faculty can view but not modify their loads."
      ],
      "enforcement": [
        "Strict 5-load cap validation on load assignment.",
        "Notify registrar and faculty when max load is reached.",
        "Prevent scheduling conflicts."
      ],
      "applies_to": ["Registrar", "Faculty"]
    },
    {
      "name": "Grading Period and Approval Rule",
      "description": "Faculty encode grades per quarter, but registrar must approve before they become visible to students.",
      "logic": [
        "Faculty submits grades for each quarter.",
        "Grades enter 'pending_approval' state.",
        "Registrar reviews and approves or rejects.",
        "Only approved grades are visible to students."
      ],
      "enforcement": [
        "Grades in pending state are locked for students.",
        "Registrar can return grades with remarks.",
        "Faculty can only edit rejected grades."
      ],
      "applies_to": ["Faculty", "Registrar", "Student"]
    },
    {
      "name": "Transferee Subject Credit Rule",
      "description": "Subject credits for transferee students are stored in the transferee_subject_credits table and reflected in their academic load.",
      "logic": [
        "Coordinator inputs credit status and grades per subject.",
        "Credited subjects are marked as completed and removed from current semester load.",
        "Not credited subjects are auto-assigned to the student's load.",
        "Registrar finalizes after reviewing the coordinator’s evaluation."
      ],
      "enforcement": [
        "Coordinator cannot finalize enrollment — only recommend.",
        "Registrar must approve before subjects are finalized.",
        "Credit decisions are logged for audit."
      ],
      "applies_to": ["Coordinator", "Registrar"]
    }
  ]
}
