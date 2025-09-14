<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ONSTS - Faculty Account</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border: 1px solid #e9ecef;
        }
        
        .header {
            background: #4f46e5;
            padding: 32px 24px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 400;
        }
        
        .content {
            padding: 32px 24px;
        }
        
        .welcome-message {
            font-size: 16px;
            margin-bottom: 24px;
            color: #374151;
            line-height: 1.6;
        }
        
        .credentials-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 12px;
            padding: 32px;
            margin: 32px 0;
            box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3);
        }
        
        .credentials-title {
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            text-align: center;
            justify-content: center;
        }
        
        .credentials-title::before {
            content: "🔐";
            margin-right: 8px;
            font-size: 20px;
        }
        
        .credential-row {
            margin-bottom: 20px;
            padding: 0;
            background: transparent;
            border-radius: 0;
            box-shadow: none;
        }
        
        .credential-label {
            font-weight: 600;
            color: #ffffff;
            font-size: 16px;
            margin-bottom: 8px;
            display: block;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .credential-value {
            background: #1f2937;
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 8px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 1px;
            display: block;
            text-align: center;
            word-break: break-all;
            border: 2px solid #4f46e5;
            box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
            margin-bottom: 8px;
        }
        
        .security-notice {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            display: flex;
            align-items: flex-start;
        }
        
        .security-icon {
            font-size: 20px;
            margin-right: 12px;
            margin-top: 1px;
        }
        
        .security-text {
            color: #92400e;
            font-weight: 500;
            line-height: 1.5;
            font-size: 14px;
        }
        
        .login-section {
            text-align: center;
            margin: 28px 0;
        }
        
        .login-button {
            display: inline-block;
            background: #4f46e5;
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s ease;
        }
        
        .login-button:hover {
            background: #4338ca;
        }
        
        .features-section {
            margin: 32px 0;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-top: 16px;
        }
        
        .feature-item {
            background: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            border-left: 3px solid #4f46e5;
        }
        
        .feature-icon {
            font-size: 16px;
            margin-right: 8px;
        }
        
        .feature-text {
            color: #374151;
            font-weight: 500;
            font-size: 14px;
        }
        
        .steps-section {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .steps-list {
            list-style: none;
            counter-reset: step-counter;
        }
        
        .step-item {
            counter-increment: step-counter;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            padding: 8px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        
        .step-item::before {
            content: counter(step-counter);
            background: #4f46e5;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-right: 12px;
            font-size: 12px;
        }
        
        .footer {
            background: #f3f4f6;
            color: #374151;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer-content {
            max-width: 400px;
            margin: 0 auto;
        }
        
        .footer-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #111827;
        }
        
        .footer-text {
            margin-bottom: 8px;
            line-height: 1.5;
            font-size: 14px;
        }
        
        .footer-email {
            color: #4f46e5;
            text-decoration: none;
            font-weight: 500;
        }
        
        .footer-disclaimer {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #d1d5db;
            font-size: 12px;
            color: #6b7280;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 12px;
            }
            
            .content {
                padding: 24px 16px;
            }
            
            .credentials-section {
                padding: 16px;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
            
            .header {
                padding: 24px 16px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">ONSTS</div>
            <div class="header-subtitle">Online Student Tracking System</div>
        </div>

        <div class="content">
            <div class="welcome-message">
                <strong>Dear {{ $name }},</strong><br><br>
                Welcome to the ONSTS Faculty Portal! Your account has been successfully created and you're now part of our educational community.
                @if(isset($assigned_strand) && $assigned_strand)
                <br><br>
                <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <div style="color: #0c4a6e; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center;">
                        <span style="font-size: 18px; margin-right: 8px;">🎓</span>
                        Strand Assignment
                    </div>
                    <div style="color: #075985; font-size: 15px; line-height: 1.5;">
                        You have been assigned as the <strong>Coordinator</strong> for the <strong>{{ $assigned_strand['name'] }} ({{ $assigned_strand['code'] }})</strong> strand. This means you'll be responsible for overseeing student enrollments and academic matters related to this strand.
                    </div>
                </div>
                @endif
            </div>

            <div class="credentials-section">
                <div class="credentials-title">🔑 Your Login Credentials</div>
                
                <div class="credential-row">
                    <div class="credential-label">📧 Email Address</div>
                    <div class="credential-value">{{ $email }}</div>
                </div>
                
                <div class="credential-row">
                    <div class="credential-label">🔒 Temporary Password</div>
                    <div class="credential-value">{{ $password }}</div>
                </div>
                
                <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 16px; margin-top: 20px; text-align: center;">
                    <div style="color: #ffffff; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                        ⚠️ IMPORTANT: Save these credentials securely
                    </div>
                    <div style="color: #f3f4f6; font-size: 13px; line-height: 1.4;">
                        Copy and save your password before closing this email. You'll need it to log in for the first time.
                    </div>
                </div>
            </div>

            <div class="security-notice">
                <div class="security-icon">🛡️</div>
                <div class="security-text">
                    <strong>Security Notice:</strong> You will be required to change your password upon first login. Please keep your credentials secure and never share them with anyone.
                </div>
            </div>

            <div class="login-section">
                <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                    <div style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">
                        🚀 Ready to Get Started?
                    </div>
                    <div style="color: #64748b; margin-bottom: 20px; font-size: 14px;">
                        Click the button below to access your faculty portal
                    </div>
                    <a href="{{ $login_url }}" class="login-button" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4); transform: translateY(0); transition: all 0.3s ease;">
                        🎯 Access Faculty Portal
                    </a>
                </div>
            </div>

            <div class="features-section">
                <div class="section-title">🎯 What You Can Do</div>
                <div class="features-grid">
                    <div class="feature-item">
                        <div class="feature-icon">📅</div>
                        <div class="feature-text">Manage Class Schedules</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">👥</div>
                        <div class="feature-text">Access Student Information</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">📊</div>
                        <div class="feature-text">Input & Track Grades</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">📝</div>
                        <div class="feature-text">Monitor Attendance</div>
                    </div>
                    @if(isset($assigned_strand) && $assigned_strand)
                    <div class="feature-item" style="background: #f0f9ff; border-left: 3px solid #0ea5e9;">
                        <div class="feature-icon">🎓</div>
                        <div class="feature-text">Coordinate {{ $assigned_strand['code'] }} Strand</div>
                    </div>
                    <div class="feature-item" style="background: #f0f9ff; border-left: 3px solid #0ea5e9;">
                        <div class="feature-icon">✅</div>
                        <div class="feature-text">Approve Student Enrollments</div>
                    </div>
                    @endif
                </div>
            </div>

            <div class="steps-section">
                <div class="section-title">🚀 Getting Started</div>
                <ol class="steps-list">
                    <li class="step-item">Click the "Access Faculty Portal" button above</li>
                    <li class="step-item">Login with your provided credentials</li>
                    <li class="step-item">Create a new secure password</li>
                    <li class="step-item">Complete your profile setup</li>
                    <li class="step-item">Explore your faculty dashboard</li>
                </ol>
            </div>
        </div>

        <div class="footer">
            <div class="footer-content">
                <div class="footer-title">Need Help?</div>
                <div class="footer-text">
                    If you have any questions or need assistance, please contact our registrar's office.
                </div>
                <div class="footer-text">
                    Email: <a href="mailto:onsts.registrar@gmail.com" class="footer-email">onsts.registrar@gmail.com</a>
                </div>
                <div class="footer-disclaimer">
                    This is an automated message from the ONSTS system. Please do not reply to this email.
                </div>
            </div>
        </div>
    </div>
</body>
</html>
