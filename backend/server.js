require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
app.use(cors());
app.use(express.json()); 

// ==========================================
// 1. STaaS: AWS S3 Configuration
// ==========================================
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// ==========================================
// 2. DBaaS: MongoDB Atlas Connection
// ==========================================
mongoose.connect(process.env.MONGO_URI, { family: 4 })
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 3. Database Schemas
// ==========================================
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const BookingSchema = new mongoose.Schema({
    userId: String,
    passengerName: String,
    destination: String,
    date: String,
    ticketUrl: String
});
const Booking = mongoose.model('Booking', BookingSchema);

// ==========================================
// 4. API Endpoints (Synced with api.js)
// ==========================================

// MATCHES: /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        
        // If user doesn't exist, create them (simplified for your lab)
        if (!user) {
            user = new User({ email, password });
            await user.save();
        }
        
        // Return userId so frontend can store it in localStorage
        res.status(200).json({ message: 'Login successful!', userId: user._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// MATCHES: /api/bookings/book
app.post('/api/bookings/book', async (req, res) => {
    try {
        const { userId, passengerName, destination, date } = req.body;

        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        doc.fontSize(25).text('Travel E-Ticket', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(`Passenger Name: ${passengerName}`);
        doc.text(`Destination: ${destination}`);
        doc.text(`Date of Travel: ${date}`);
        doc.end();

        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `ticket-${Date.now()}.pdf`;

            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileName,
                Body: pdfData,
                ContentType: 'application/pdf'
            };

            await s3Client.send(new PutObjectCommand(uploadParams));
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

            const newBooking = new Booking({ userId, passengerName, destination, date, ticketUrl });
            await newBooking.save();

            res.status(200).json({ message: 'Booking Confirmed!', ticketUrl });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process booking' });
    }
});

// ==========================================
// 5. Start Server
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});