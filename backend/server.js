// ... [Schema and Setup stay same] ...

app.post('/api/bookings/book', async (req, res) => {
    try {
        const { userId, passengerName, source, destination, date, transportType, foodPref, stayDuration } = req.body;
        const pnr = 'T1-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        // Header
        doc.rect(0, 0, 612, 100).fill('#2c3e50'); 
        doc.fillColor('white').fontSize(30).text('TRAVEL1', 50, 40);
        doc.fontSize(10).text('SECURE CLOUD BOARDING PASS', 50, 75);

        // Body
        doc.fillColor('black').fontSize(20).text('E-TICKET', 50, 130);
        doc.fontSize(10).text(`PNR: ${pnr}`, 480, 135);
        doc.moveTo(50, 155).lineTo(550, 155).stroke();

        // Dynamically using the user's input cities
        doc.fontSize(12).text(`PASSENGER: ${passengerName.toUpperCase()}`, 50, 185);
        doc.text(`TRANSPORT: ${transportType}`, 50, 210);
        doc.text(`MEAL: ${foodPref}`, 250, 210);
        doc.text(`STAY: ${stayDuration}`, 420, 210);
        
        doc.fontSize(22).text(`${source.toUpperCase()}`, 50, 260);
        doc.fontSize(10).text('ORIGIN CITY', 50, 285);
        
        doc.fontSize(18).text(`TO`, 280, 260); // Professional center text
        
        doc.fontSize(22).text(`${destination.toUpperCase()}`, 450, 260);
        doc.fontSize(10).text('DESTINATION CITY', 450, 285);

        doc.moveTo(50, 320).lineTo(550, 320).stroke();
        doc.fontSize(12).text(`DEPARTURE DATE: ${date}`, 50, 340);

        // THE VIKING WATERMARK (Centered at bottom)
        doc.fontSize(50).fillColor('#f0f0f0').text('VIKING', 220, 650);
        
        // Footer Details
        doc.fontSize(8).fillColor('grey').text('TRAVEL1 Systems | support@travel1.com | +91 98765 43210', 50, 720, {align: 'center'});
        doc.end();

        // ... [S3 Upload logic stays same] ...