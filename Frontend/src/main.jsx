import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import ErrorBoundary from './components/common/ErrorBoundary';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')).render(
    <Provider store={store}>
        <GoogleOAuthProvider clientId={clientId}>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </GoogleOAuthProvider>
    </Provider>
)
