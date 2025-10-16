<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ONSTS Faculty Account Created</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4f46e5;
        }
        .header h1 {
            color: #4f46e5;
            margin: 0;
            font-size: 24px;
        }
        .header h2 {
            color: #666;
            margin: 5px 0 0 0;
            font-size: 16px;
            font-weight: normal;
        }
        .content {
            margin-bottom: 30px;
        }
        .credentials-box {
            background-color: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .credentials-box h3 {
            color: #4f46e5;
            margin-top: 0;
            margin-bottom: 15px;
        }
        .credential-item {
            margin-bottom: 10px;
            padding: 8px 0;
        }
        .credential-label {
            font-weight: bold;
            color: #374151;
            display: inline-block;
            width: 120px;
        }
        .credential-value {
            color: #1f2937;
            font-family: 'Courier New', monospace;
            background-color: #ffffff;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #d1d5db;
        }
        .login-button {
            display: inline-block;
            background-color: #4f46e5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .login-button:hover {
            background-color: #4338ca;
        }
        .instructions {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
        .instructions h4 {
            color: #92400e;
            margin-top: 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .security-note {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
        }
        .security-note h4 {
            color: #dc2626;
            margin-top: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</h1>
            <h2>Senior High School Department</h2>
        </div>

        <div class="content">
            <h3>Welcome to ONSTS Faculty Portal!</h3>
            
            <p>Dear <strong>{{ $faculty->firstname }} {{ $faculty->lastname }}</strong>,</p>
            
            <p>Congratulations! Your faculty account has been successfully created in the ONSTS Student Information System. You now have access to the faculty portal where you can manage your classes, input grades, and access student information.</p>

            <div class="credentials-box">
                <h3>🔐 Your Login Credentials</h3>
                <div class="credential-item">
                    <span class="credential-label">Email:</span>
                    <span class="credential-value">{{ $faculty->email }}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Password:</span>
                    <span class="credential-value">{{ $password }}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Login URL:</span>
                    <span class="credential-value">{{ $login_url }}</span>
                </div>
            </div>

            <div class="instructions">
                <h4>📋 First Login Instructions</h4>
                <ol>
                    <li>Click the login button below or visit the login URL</li>
                    <li>Enter your email and the temporary password provided</li>
                    <li><strong>You will be required to change your password on first login</strong></li>
                    <li>Choose a strong password that you can remember</li>
                    <li>Complete your profile setup if prompted</li>
                </ol>
            </div>

            <div style="text-align: center;">
                <a href="{{ $login_url }}" class="login-button">🚀 Login to Faculty Portal</a>
            </div>

            <div class="security-note">
                <h4>🔒 Security Notice</h4>
                <ul>
                    <li><strong>Keep your credentials secure</strong> - Do not share your login details with anyone</li>
                    <li><strong>Change your password immediately</strong> after first login</li>
                    <li><strong>Use a strong password</strong> with at least 8 characters, including letters, numbers, and symbols</li>
                    <li><strong>Log out properly</strong> when finished using the system</li>
                </ul>
            </div>

            <h4>📚 What You Can Do in the Faculty Portal:</h4>
            <ul>
                <li><strong>Class Management:</strong> View your assigned classes and schedules</li>
                <li><strong>Grade Input:</strong> Enter and submit student grades for approval</li>
                <li><strong>Student Records:</strong> Access student enrollment and academic information</li>
                <li><strong>Reports:</strong> Generate class lists and grade reports</li>
                <li><strong>Profile Management:</strong> Update your personal information</li>
            </ul>

            <p>If you encounter any issues logging in or have questions about using the system, please contact the registrar's office or the IT support team.</p>

            <p>Welcome to the ONSTS family! We look forward to working with you.</p>

            <p>Best regards,<br>
            <strong>ONSTS Registrar's Office</strong><br>
            Opol National Secondary Technical School</p>
        </div>

        <div class="footer">
            <p>This is an automated message from the ONSTS Student Information System.</p>
            <p>Please do not reply to this email. For support, contact the registrar's office.</p>
            <p>&copy; {{ date('Y') }} Opol National Secondary Technical School. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
