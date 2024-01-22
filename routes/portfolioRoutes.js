import { Router } from "express";
import nodemailer from 'nodemailer'
const portfolioRoutes = Router();

portfolioRoutes.post('/contact', async (req, res) => {

    const { senderEmail, message } = req.body;

    const emailBody = `Message from: ${senderEmail}\n\n${message}`;

    const myEmail = 'lee.dyer.dev@gmail.com';
    const myPhone = 12318818138


    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });

    try {
        const info = await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER,
            subject: `👾!Form Submitted!👾 ${senderEmail}`,
            text: emailBody,
            replyTo: senderEmail
        });

        console.log('Message sent: %s', info.messageId);
        res.status(200).send('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email: ', error);
        res.status(500).send(error.toString());
    }
});

export default portfolioRoutes