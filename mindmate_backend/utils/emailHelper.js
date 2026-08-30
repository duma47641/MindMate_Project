import nodemailer from 'nodemailer';

// Email Sending Function 
export const sendAppointmentEmail = async (patientEmail, patientName, doctorName, date, timeSlot, status) => {
    try {
      
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let subject = '';
        let statusTitle = '';
        let statusColor = '';
        let messageBody = '';

        if (status === 'Approved') {
            subject = `✅ Appointment Confirmed - ${process.env.CLINIC_NAME || 'MindMate'}`;
            statusTitle = 'Appointment Approved!';
            statusColor = '#0d9488'; // Teal color
            messageBody = `Great news! Your channeling request with <b>${doctorName}</b> has been officially approved. Please ensure your payment is cleared to activate the clinical intake room.`;
        } else if (status === 'Cancelled') {
            subject = `❌ Appointment Update - ${process.env.CLINIC_NAME || 'MindMate'}`;
            statusTitle = 'Appointment Cancelled';
            statusColor = '#e11d48'; // Rose/Red color
            messageBody = `We regret to inform you that your scheduled appointment with <b>${doctorName}</b> has been cancelled or declined. If this was a mistake, please reach out to our desk support or re-book a slot.`;
        } else {
            return;
        }

        //   Dark-Themed HTML Template
        const htmlContent = `
        <div style="background-color: #020617; color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; border-radius: 16px; max-width: 550px; margin: auto; border: 1px solid #1e293b;">
            <div style="text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px;">
                <h2 style="color: #2dd4bf; margin: 0; font-size: 22px;"> MindMate Medical Portal</h2>
                <p style="color: #94a3b8; font-size: 11px; margin: 5px 0 0 0;">Official Clinical Notification</p>
            </div>
            <div style="background-color: ${statusColor}15; border: 1px solid ${statusColor}40; border-radius: 12px; padding: 15px; margin-top: 25px; text-align: center;">
                <h3 style="color: ${statusColor}; margin: 0; font-size: 18px; font-weight: bold;">${statusTitle}</h3>
            </div>
            <div style="padding: 10px 5px; line-height: 1.6; font-size: 13px; color: #cbd5e1;">
                <p>Dear <b>${patientName}</b>,</p>
                <p>${messageBody}</p>
                <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 15px; margin-top: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Session Parameters:</h4>
                    <table style="width: 100%; font-size: 13px; color: #f1f5f9;">
                        <tr><td style="color: #64748b; padding: 4px 0; width: 35%;">Practitioner:</td><td style="font-weight: bold; color: #2dd4bf;">${doctorName}</td></tr>
                        <tr><td style="color: #64748b; padding: 4px 0;">Session Date:</td><td>${date}</td></tr>
                        <tr><td style="color: #64748b; padding: 4px 0;">Time Slot:</td><td>${timeSlot}</td></tr>
                    </table>
                </div>
            </div>
            <div style="text-align: center; border-top: 1px solid #1e293b; margin-top: 30px; padding-top: 15px; font-size: 11px; color: #64748b;">
                <p style="margin: 0;">This is an automated system dispatch file. Please do not reply directly to this email.</p>
                <p style="margin: 5px 0 0 0;">&copy; 2026 MindMate Inc. Sri Lanka. All Rights Authorized.</p>
            </div>
        </div>
        `;

        const mailOptions = {
            from: `"${process.env.CLINIC_NAME || 'MindMate'}" <${process.env.EMAIL_USER}>`,
            to: patientEmail,
            subject: subject,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(` Notification Email successfully sent to ${patientEmail} [Status: ${status}]`);
    } catch (error) {
        console.error(" Nodemailer engine execution failure:", error.message);
    }
};