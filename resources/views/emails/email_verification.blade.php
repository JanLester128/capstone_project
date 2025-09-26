<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ONSTS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: #667eea;
            font-weight: bold;
            position: relative;
            z-index: 1;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
        }
        
        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.7;
        }
        
        .verification-code-container {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border: 2px dashed #cbd5e0;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        
        .verification-code-label {
            font-size: 14px;
            color: #718096;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        
        .verification-code {
            font-size: 36px;
            font-weight: 800;
            color: #667eea;
            font-family: 'Courier New', monospace;
            letter-spacing: 8px;
            margin: 15px 0;
            text-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
        }
        
        .code-note {
            font-size: 13px;
            color: #a0aec0;
            margin-top: 15px;
        }
        
        .instructions {
            background-color: #f0f8ff;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .instructions h3 {
            color: #2d3748;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
        }
        
        .instructions ul {
            list-style: none;
            padding: 0;
        }
        
        .instructions li {
            color: #4a5568;
            font-size: 14px;
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .instructions li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #48bb78;
            font-weight: bold;
        }
        
        .warning {
            background-color: #fffbf0;
            border: 1px solid #f6e05e;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
        }
        
        .warning-icon {
            color: #d69e2e;
            font-size: 18px;
            margin-right: 8px;
        }
        
        .warning-text {
            color: #744210;
            font-size: 14px;
            font-weight: 500;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer-logo {
            font-size: 18px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .footer-text {
            font-size: 13px;
            color: #718096;
            margin-bottom: 15px;
        }
        
        .footer-links {
            font-size: 12px;
            color: #a0aec0;
        }
        
        .footer-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }
        
        .footer-links a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .verification-code {
                font-size: 28px;
                letter-spacing: 4px;
            }
            
            .footer {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                📧
            </div>
            <h1>Email Verification</h1>
            <p>Secure your ONSTS account</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hello {{ $firstname }} {{ $lastname }}!
            </div>
            
            <div class="message">
                Thank you for registering with <strong>ONSTS (Online Student Tracking System)</strong>. 
                To complete your registration and secure your account, please verify your email address 
                using the verification code below.
            </div>
            
            <!-- Verification Code -->
            <div class="verification-code-container">
                <div class="verification-code-label">Your Verification Code</div>
                <div class="verification-code">{{ $code }}</div>
                <div class="code-note">This code expires in 10 minutes</div>
            </div>
            
            <!-- Instructions -->
            <div class="instructions">
                <h3>How to verify your email:</h3>
                <ul>
                    <li>Copy the 6-digit code above</li>
                    <li>Return to the ONSTS registration page</li>
                    <li>Enter the code in the verification field</li>
                    <li>Complete your account setup</li>
                </ul>
            </div>
            
            <!-- Warning -->
            <div class="warning">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">
                    <strong>Security Notice:</strong> This verification code is valid for 10 minutes only. 
                    If you didn't request this code, please ignore this email. Never share this code with anyone.
                </span>
            </div>
            
            <div class="message">
                If you're having trouble with verification, you can request a new code from the registration page. 
                For any assistance, please contact our support team.
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-logo">ONSTS</div>
            <div class="footer-text">
                Online Student Tracking System<br>
                Secure • Reliable • Innovative
            </div>
            <div class="footer-links">
                <a href="#">Privacy Policy</a> |
                <a href="#">Terms of Service</a> |
                <a href="#">Support</a>
            </div>
        </div>
    </div>
</body>
</html>
