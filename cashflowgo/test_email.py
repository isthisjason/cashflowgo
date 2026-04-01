import smtplib

smtp_server = "smtp.gmail.com"
smtp_port = 587
email_user = "cmpt370cashflowgo@gmail.com"
email_password = "rbme hcqg xqgp uagb"  # Replace with your App Password

try:
    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()  # Secure the connection
    server.login(email_user, email_password)
    print("Login successful")
    server.quit()
except Exception as e:
    print("Failed to login:", e)