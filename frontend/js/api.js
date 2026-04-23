const API_URL = 'http://localhost:5000/api'; // CHANGE THIS TO YOUR EC2 IP LATER (e.g., http://54.123.45.67:5000/api)

// Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('userId', data.userId);
            window.location.href = 'booking.html'; // Redirect on success
        } else {
            document.getElementById('loginMessage').innerText = data.error;
        }
    });
}

// Handle Booking
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const passengerName = document.getElementById('passengerName').value;
        const destination = document.getElementById('destination').value;
        const date = document.getElementById('date').value;
        const userId = localStorage.getItem('userId');

        if (!userId) {
            alert("Please login first!");
            window.location.href = 'login.html';
            return;
        }

        const res = await fetch(`${API_URL}/bookings/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, passengerName, destination, date })
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById('result').style.display = 'block';
            document.getElementById('downloadLink').href = data.ticketUrl; // The AWS S3 Link
        } else {
            alert('Booking failed.');
        }
    });
}