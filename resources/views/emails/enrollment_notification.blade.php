<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Enrollment {{ ucfirst($status) }} - ONSTS</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .status-approved {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #28a745;
            margin: 20px 0;
        }
        .status-rejected {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #dc3545;
            margin: 20px 0;
        }
        .schedule-info {
            background: white;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border: 1px solid #dee2e6;
        }
        .login-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
        }
        .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ONSTS - Our Lady of Nazareth School of Toril</h1>
        <p>Enrollment Notification</p>
    </div>

    <div class="content">
        <h2>Dear {{ $student_name }},</h2>

        @if($status === 'approved')
            <div class="status-approved">
                <h3>🎉 Congratulations! Your enrollment has been APPROVED!</h3>
                <p>We are pleased to inform you that your enrollment application has been successfully approved by the coordinator.</p>
            </div>

            <div class="schedule-info">
                <h4>📚 Enrollment Details:</h4>
                <ul>
                    <li><strong>Strand:</strong> {{ $strand }}</li>
                    <li><strong>School Year:</strong> {{ $school_year }}</li>
                    <li><strong>Status:</strong> Enrolled</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p><strong>🎓 Your enrollment has been successfully approved!</strong></p>
                <p>To view your complete class schedule, subjects, and room assignments, please log in to your student portal:</p>
                
                <a href="http://localhost:8000/login" class="login-button" style="color: white; text-decoration: none;">
                    🔐 Login to Student Portal
                </a>
                
                <p style="font-size: 14px; color: #6c757d; margin-top: 15px;">
                    Click the button above to access your dashboard and view your schedule
                </p>
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Click the login button above to access your student portal</li>
                <li>Review your class schedules and room assignments</li>
                <li>Prepare for the start of classes</li>
                <li>Contact the registrar if you have any questions</li>
            </ul>

        @elseif($status === 'rejected')
            <div class="status-rejected">
                <h3>❌ Enrollment Application Status</h3>
                <p>We regret to inform you that your enrollment application has been rejected by the coordinator.</p>
            </div>

            <p><strong>What you can do:</strong></p>
            <ul>
                <li>Contact the coordinator for specific feedback</li>
                <li>Review and update your application if possible</li>
                <li>Submit a new application if requirements are met</li>
                <li>Visit the registrar's office for assistance</li>
            </ul>
        @endif

        <p>If you have any questions or concerns, please don't hesitate to contact us:</p>
        <ul>
            <li><strong>Email:</strong> registrar@onsts.edu.ph</li>
            <li><strong>Phone:</strong> (082) 123-4567</li>
            <li><strong>Office Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM</li>
        </ul>
    </div>

    <div class="footer">
        <p>This is an automated notification from ONSTS Student Information System.</p>
        <p>&copy; {{ date('Y') }} Our Lady of Nazareth School of Toril. All rights reserved.</p>
    </div>
</body>
</html>
