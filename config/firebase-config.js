import admin from 'firebase-admin';

// Log environment variables for debugging (be careful to avoid logging sensitive information in production)
console.log('Initializing Firebase Admin SDK with project ID:', process.env.FIREBASE_PROJECT_ID);

if (!admin.apps.length) {
    try {
        console.log('No existing Firebase apps found, initializing Firebase Admin SDK.');

        admin.initializeApp({
            credential: admin.credential.cert({
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: process.env.FIREBASE_AUTH_URI,
                token_uri: process.env.FIREBASE_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
                client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
            }),
        });

        console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
    }
} else {
    console.log('Firebase Admin SDK has already been initialized.');
}

export default admin;
