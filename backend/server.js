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
    source: String,
    destination: String,
    transportType: String,
    foodPref: String, // Added for Consumer UX
    date: String,
    ticketUrl: String
});
const Booking = mongoose.model('Booking', BookingSchema);

// ==========================================
// 4. API Endpoints
// ==========================================

// Auth Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, password });
            await user.save();
        }
        res.status(200).json({ message: 'Login successful!', userId: user._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Booking Route + PDF Generation + S3 Upload
app.post('/api/bookings/book', async (req, res) => {
    try {
        const { userId, passengerName, source, destination, date, transportType, foodPref } = req.body;

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        // --- Professional Ticket UI Design ---
        doc.rect(0, 0, 612, 100).fill('#2c3e50'); // Header Bar
        doc.fillColor('white').fontSize(30).text('TRAVEL1', 50, 40);
        doc.fontSize(10).text('Premium E-Ticket | Cloud-Native System', 50, 75);

        doc.fillColor('black').fontSize(20).text('BOARDING PASS', 50, 130);
        doc.moveTo(50, 155).lineTo(550, 155).stroke();

        doc.fontSize(12).text(`PASSENGER: ${passengerName.toUpperCase()}`, 50, 180);
        doc.text(`TRANSPORT: ${transportType}`, 50, 205);
        doc.text(`MEAL PREF: ${foodPref}`, 300, 205); 
        
        doc.fontSize(18).text(`${source.toUpperCase()}`, 50, 250);
        doc.fontSize(10).text('ORIGIN', 50, 270);
        
        doc.fontSize(18).text(`>>> TO >>>`, 250, 250);
        
        doc.fontSize(18).text(`${destination.toUpperCase()}`, 450, 250);
        doc.fontSize(10).text('DESTINATION', 450, 270);

        doc.moveTo(50, 310).lineTo(550, 310).stroke();
        doc.fontSize(12).text(`DATE OF TRAVEL: ${date}`, 50, 330);

        // Footer & Branding
        doc.fontSize(8).fillColor('grey').text('TRAVEL1 Systems - Cloud Integrated Ticketing', 50, 680, {align: 'center'});
        doc.text('Mumbai | London | Dubai | Tokyo', 50, 695, {align: 'center'});
        doc.end();

        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `T1-ticket-${Date.now()}.pdf`;

            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileName,
                Body: pdfData,
                ContentType: 'application/pdf'
            };

            // Send to AWS S3
            await s3Client.send(new PutObjectCommand(uploadParams));
            
            // Generate public URL
            const ticketUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

            // Save to MongoDB Atlas
            const newBooking = new Booking({ 
                userId, 
                passengerName, 
                source, 
                destination, 
                date, 
                transportType, 
                foodPref, 
                ticketUrl 
            });
            await newBooking.save();

            // Respond to Frontend
            res.status(200).json({ message: 'Success', ticketUrl });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process booking' });
    }
});

// ==========================================
// 5. Start TRAVEL1 Engine
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 TRAVEL1 Backend Active on Port ${PORT}`);
});