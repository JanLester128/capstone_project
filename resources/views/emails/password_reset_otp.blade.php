<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP - ONSTS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 40px 20px;
            min-height: 100vh;
        }
        .email-wrapper {
            max-width: 650px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            position: relative;
        }
        .email-wrapper::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c);
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%);
            color: white;
            padding: 50px 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }
        .logo-container {
            position: relative;
            z-index: 2;
            margin-bottom: 25px;
        }
        .logo {
            width: 90px;
            height: 90px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ffffff, #f8fafc);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 800;
            color: #1e3a8a;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border: 3px solid rgba(255, 255, 255, 0.3);
        }
        .header-title {
            position: relative;
            z-index: 2;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header-subtitle {
            position: relative;
            z-index: 2;
            font-size: 16px;
            opacity: 0.9;
            font-weight: 400;
            letter-spacing: 0.5px;
        }
        .content {
            padding: 50px 40px;
            background: #ffffff;
        }
        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1a202c;
            margin-bottom: 20px;
        }
        .intro-text {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 40px;
            line-height: 1.7;
        }
        .otp-container {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border: 2px solid #e2e8f0;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            margin: 40px 0;
            position: relative;
            overflow: hidden;
        }
        .otp-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        .otp-label {
            font-size: 14px;
            font-weight: 600;
            color: #4a5568;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        .otp-code {
            font-size: 48px;
            font-weight: 800;
            color: #1e3a8a;
            letter-spacing: 12px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            text-shadow: 0 2px 4px rgba(30, 58, 138, 0.1);
        }
        .otp-expiry {
            font-size: 14px;
            color: #718096;
            font-weight: 500;
        }
        .security-notice {
            background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
            border: 1px solid #f6ad55;
            border-radius: 15px;
            padding: 25px;
            margin: 40px 0;
            position: relative;
        }
        .security-notice::before {
            content: '🔒';
            position: absolute;
            top: -10px;
            left: 20px;
            background: #ffffff;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 18px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .security-title {
            font-size: 18px;
            font-weight: 700;
            color: #c05621;
            margin-bottom: 15px;
            margin-top: 10px;
        }
        .security-list {
            list-style: none;
            padding: 0;
        }
        .security-list li {
            padding: 8px 0;
            color: #9c4221;
            font-weight: 500;
            position: relative;
            padding-left: 25px;
        }
        .security-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #c05621;
            font-weight: bold;
        }
        .account-details {
            background: #f7fafc;
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #4299e1;
        }
        .account-details h4 {
            font-size: 16px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 15px;
        }
        .account-info {
            font-size: 14px;
            color: #4a5568;
            line-height: 1.8;
        }
        .footer {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 40px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer-text {
            color: #718096;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .footer-copyright {
            color: #a0aec0;
            font-size: 12px;
            font-weight: 600;
            margin-top: 20px;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 30px 0;
        }
        @media (max-width: 600px) {
            .email-wrapper {
                margin: 20px;
                border-radius: 15px;
            }
            .header {
                padding: 40px 30px;
            }
            .content {
                padding: 40px 30px;
            }
            .otp-code {
                font-size: 36px;
                letter-spacing: 8px;
            }
        }
        .btn {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="header">
            <h1 class="header-title">Password Reset Request</h1>
            <p class="header-subtitle">OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</p>
        </div>
        
        <div class="content">
            <h2 class="greeting">Hello {{ $name }},</h2>
            
            <p class="intro-text">We received a request to reset your password for your ONSTS account. Please use the secure OTP code below to proceed with your password reset.</p>
            
            <div class="otp-container">
                <div class="otp-label">Your Secure OTP Code</div>
                <div class="otp-code">{{ $otp }}</div>
                <div class="otp-expiry">⏱️ This code expires in 15 minutes</div>
            </div>
            
            <div class="security-notice">
                <h4 class="security-title">Security Guidelines</h4>
                <ul class="security-list">
                    <li>This OTP is valid for 15 minutes only</li>
                    <li>Do not share this code with anyone</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Contact the system administrator if you have concerns</li>
                </ul>
            </div>
            
            <div class="divider"></div>
            
            <p class="intro-text">Enter this OTP on the password reset page to create your new secure password.</p>
            
            <div class="account-details">
                <h4>📋 Account Information</h4>
                <div class="account-info">
                    <strong>Email:</strong> {{ $email }}<br>
                    <strong>Role:</strong> {{ ucfirst($role) }}<br>
                    <strong>Request Time:</strong> {{ now()->format('F j, Y \\a\\t g:i A') }}
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">This is an automated security message from the ONSTS Password Reset System.</p>
            <p class="footer-text">If you have any questions or concerns, please contact your system administrator.</p>
            <p class="footer-copyright">&copy; {{ date('Y') }} OPOL NATIONAL SECONDARY TECHNICAL SCHOOL</p>
        </div>
    </div>
</body>
</html>
