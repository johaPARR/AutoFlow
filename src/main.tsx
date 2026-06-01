import React from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react' 
import './index.css'
import App from './App.tsx'

// Global error overlay for easy debugging
window.addEventListener('error', (event) => {
  const overlay = document.getElementById('error-overlay') || document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.98)';
  overlay.style.color = '#ef4444';
  overlay.style.padding = '32px';
  overlay.style.fontFamily = 'Consolas, Monaco, monospace';
  overlay.style.zIndex = '999999';
  overlay.style.overflow = 'auto';
  overlay.style.whiteSpace = 'pre-wrap';
  overlay.style.boxSizing = 'border-box';
  overlay.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <h1 style="color: #f87171; font-size: 28px; margin: 0 0 16px 0; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">🚨 Error en tiempo de ejecución</h1>
      <p style="font-weight: bold; font-size: 18px; color: #fecdd3; margin: 0 0 12px 0;">${event.message}</p>
      <div style="color: #9ca3af; font-size: 14px; margin-bottom: 20px;">
        <strong>Archivo:</strong> ${event.filename} <br/>
        <strong>Línea:</strong> ${event.lineno} | <strong>Columna:</strong> ${event.colno}
      </div>
      <h3 style="color: #e2e8f0; font-size: 16px; margin: 24px 0 8px 0;">Pila de llamadas (Stack Trace):</h3>
      <pre style="background: #1e293b; padding: 20px; border-radius: 8px; color: #f8fafc; overflow-x: auto; border: 1px solid #334155; font-size: 13px; line-height: 1.5;">${event.error ? event.error.stack : 'No hay detalles de la pila disponibles.'}</pre>
      <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px; text-align: center;">Toma una captura de esta pantalla y compártela para solucionarlo.</p>
    </div>
  `;
  document.body.appendChild(overlay);
});

// Catch unhandled promise rejections as well
window.addEventListener('unhandledrejection', (event) => {
  const overlay = document.getElementById('error-overlay') || document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.98)';
  overlay.style.color = '#ef4444';
  overlay.style.padding = '32px';
  overlay.style.fontFamily = 'Consolas, Monaco, monospace';
  overlay.style.zIndex = '999999';
  overlay.style.overflow = 'auto';
  overlay.style.whiteSpace = 'pre-wrap';
  overlay.style.boxSizing = 'border-box';
  
  const errorMessage = event.reason && event.reason.message ? event.reason.message : String(event.reason);
  const errorStack = event.reason && event.reason.stack ? event.reason.stack : 'No hay detalles de la pila disponibles.';
  
  overlay.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <h1 style="color: #f87171; font-size: 28px; margin: 0 0 16px 0; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">🚨 Promesa rechazada no controlada</h1>
      <p style="font-weight: bold; font-size: 18px; color: #fecdd3; margin: 0 0 12px 0;">${errorMessage}</p>
      <h3 style="color: #e2e8f0; font-size: 16px; margin: 24px 0 8px 0;">Detalles del error:</h3>
      <pre style="background: #1e293b; padding: 20px; border-radius: 8px; color: #f8fafc; overflow-x: auto; border: 1px solid #334155; font-size: 13px; line-height: 1.5;">${errorStack}</pre>
      <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px; text-align: center;">Toma una captura de esta pantalla y compártela para solucionarlo.</p>
    </div>
  `;
  document.body.appendChild(overlay);
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)