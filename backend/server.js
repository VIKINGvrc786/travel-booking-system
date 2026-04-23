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
// 2. DBaaS: MongoDB Atlas Connection (IPv4 Forced)
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
    name: String,
    destination: String,
    date: String,
    ticketUrl: String
});
const Booking = mongoose.model('Booking', BookingSchema);

// ==========================================
// 4. API Endpoints
// ==========================================

// Simple Login/Register Route
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        
        if (!user) {
            user = new User({ email, password });
            await user.save();
        }
        res.status(200).json({ message: 'Login successful!', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Book Trip, Generate PDF, Upload to S3
app.post('/api/book', async (req, res) => {
    try {
        const { name, destination, date } = req.body;

        // Create PDF
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        doc.fontSize(25).text('Travel E-Ticket', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(`Passenger Name: ${name}`);
        doc.text(`Destination: ${destination}`);
        doc.text(`Date of Travel: ${date}`);
        doc.end();

        // When PDF is done generating...
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `ticket-${Date.now()}.pdf`;

            // Upload parameters for AWS S3
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileName,
                Body: pdfData,
                ContentType: 'application/pdf'
            };

            // Send to S3
            await s3Client.send(new PutObjectCommand(uploadParams));
            
            // Generate public URL
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

            // Save to MongoDB
            const newBooking = new Booking({ name, destination, date, ticketUrl });
            await newBooking.save();

            // Send URL back to Frontend
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