"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sun, Moon } from 'lucide-react';
import './privacy.css';

export default function PrivacyPolicy() {
    const [lang, setLang] = useState('es');
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Detect current theme
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        checkTheme();

        // Listen for changes (e.g., system theme changes)
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    const toggleTheme = () => {
        const newTheme = isDark ? 'light' : 'dark';
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        setIsDark(!isDark);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-black/10 dark:border-white/10 h-20">
                <div className="container mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/">
                            <Image
                                src={isDark ? "/images/logo_verde.png" : "/images/LOGO-ligth.png"}
                                alt="Full Tranqui Logo"
                                width={150}
                                height={30}
                                className="h-10 w-auto object-contain"
                                priority
                            />
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-[#202d35]/50 dark:hover:border-[#ccff00]/50 transition-all group"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <Sun className="w-5 h-5 text-gray-400 group-hover:text-[#ccff00] transition-colors" />
                            ) : (
                                <Moon className="w-5 h-5 text-gray-600 group-hover:text-[#202d35] transition-colors" />
                            )}
                        </button>

                        <Link
                            href="/"
                            className="text-sm font-bold text-[#202d35] dark:text-[#ccff00] hover:opacity-80 transition-all"
                        >
                            VOLVER AL INICIO
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="privacyWrapper pt-32">
                {/* Language Toggle */}
                <div className="lang-toggle">
                    <button
                        className={`lang-btn ${lang === 'es' ? 'active' : ''}`}
                        onClick={() => setLang('es')}
                    >
                        Español
                    </button>
                    <button
                        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                        onClick={() => setLang('en')}
                    >
                        English
                    </button>
                </div>

                {/* ==================== SPANISH VERSION ==================== */}
                {
                    lang === 'es' && (
                        <div className="lang-es">
                            <h1>Política de Privacidad</h1>
                            <p className="date">Última actualización: 5 de febrero de 2026</p>
                            <p className="date">Efectiva desde: 5 de febrero de 2026</p>

                            <div className="highlight">
                                <strong>FullTranki</strong> ("nosotros", "nuestro", "la aplicación" o "el servicio") es un sistema de alertas médicas de emergencia desarrollado por <strong>MEGA DEEP ANALYTICS SAS</strong>. Esta política de privacidad explica de manera clara y transparente cómo recopilamos, usamos, almacenamos, compartimos y protegemos su información personal cuando utiliza nuestra aplicación móvil para Android.
                                <br /><br />
                                <strong>Al utilizar FullTranki, usted acepta las prácticas descritas en esta política.</strong>
                            </div>

                            <div className="toc">
                                <h3>Índice de Contenidos</h3>
                                <ol>
                                    <li><a href="#es-info-recopilada">Información que Recopilamos</a></li>
                                    <li><a href="#es-uso-info">Cómo Usamos su Información</a></li>
                                    <li><a href="#es-compartir-info">Cómo Compartimos su Información</a></li>
                                    <li><a href="#es-servicios-terceros">Servicios de Terceros</a></li>
                                    <li><a href="#es-almacenamiento">Almacenamiento y Seguridad</a></li>
                                    <li><a href="#es-retencion">Retención de Datos</a></li>
                                    <li><a href="#es-derechos">Sus Derechos</a></li>
                                    <li><a href="#es-deletion-request">Solicitud de Eliminación de Cuenta</a></li>
                                    <li><a href="#es-permisos">Permisos de la Aplicación</a></li>
                                    <li><a href="#es-menores">Menores de Edad</a></li>
                                    <li><a href="#es-internacional">Transferencias Internacionales</a></li>
                                    <li><a href="#es-gdpr">Base Legal (GDPR/UE)</a></li>
                                    <li><a href="#es-cambios">Cambios a esta Política</a></li>
                                    <li><a href="#es-contacto">Contacto</a></li>
                                </ol>
                            </div>

                            <h2 id="es-info-recopilada">1. Información que Recopilamos</h2>

                            <p>Recopilamos diferentes tipos de información para proporcionar y mejorar nuestro servicio de alertas de emergencia. A continuación se detalla cada categoría:</p>

                            <h3>1.1 Información Personal (Proporcionada por Usted)</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Dato</th>
                                        <th>Propósito</th>
                                        <th>Obligatorio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Nombre completo</strong></td>
                                        <td>Identificar su cuenta y personalizar alertas de emergencia</td>
                                        <td><span className="badge badge-required">Requerido</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Correo electrónico</strong></td>
                                        <td>Autenticación de cuenta y recuperación de contraseña</td>
                                        <td><span className="badge badge-required">Requerido</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Número de teléfono</strong></td>
                                        <td>Identificación en alertas de emergencia</td>
                                        <td><span className="badge badge-required">Requerido</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Contacto de emergencia 1</strong></td>
                                        <td>Nombre y teléfono del contacto principal para recibir alertas</td>
                                        <td><span className="badge badge-required">Requerido</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Contacto de emergencia 2</strong></td>
                                        <td>Nombre y teléfono del contacto secundario</td>
                                        <td><span className="badge badge-optional">Opcional</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Centro de salud</strong></td>
                                        <td>Nombre y teléfono de entidad médica para alertas</td>
                                        <td><span className="badge badge-optional">Opcional</span></td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>1.2 Datos de Ubicación</h3>
                            <div className="warning">
                                <strong>Importante:</strong> La ubicación es fundamental para el funcionamiento del servicio de emergencias.
                            </div>
                            <ul>
                                <li><strong>Ubicación precisa (GPS):</strong> Capturamos sus coordenadas geográficas (latitud y longitud) cuando se activa una alerta de emergencia. Esta ubicación se comparte con sus contactos de emergencia para que puedan localizarle.</li>
                                <li><strong>Ubicación en segundo plano:</strong> La aplicación accede a su ubicación incluso cuando no está en uso activo. Esto es esencial para poder enviar su ubicación durante una emergencia detectada automáticamente por el beacon.</li>
                            </ul>

                            <h3>1.3 Información del Dispositivo y Beacon</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Dato</th>
                                        <th>Propósito</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Dirección MAC del beacon</strong></td>
                                        <td>Identificar y emparejar su dispositivo KSensor de forma única</td>
                                    </tr>
                                    <tr>
                                        <td><strong>UUID, Major, Minor del beacon</strong></td>
                                        <td>Configuración de identificación del beacon iBeacon</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Nivel de batería del beacon</strong></td>
                                        <td>Alertarle cuando la batería está baja</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Intensidad de señal (RSSI)</strong></td>
                                        <td>Determinar proximidad y calidad de conexión</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Datos de sensores</strong></td>
                                        <td>Temperatura ambiente, datos del acelerómetro (detección de movimiento/pasos)</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Modelo de dispositivo Android</strong></td>
                                        <td>Soporte técnico y reportes de errores</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Versión de Android</strong></td>
                                        <td>Compatibilidad y soporte técnico</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>1.4 Datos de Actividad de la Aplicación</h3>
                            <ul>
                                <li><strong>Historial de eventos:</strong> Registramos cada vez que presiona el botón del beacon (tipo de presión, fecha/hora)</li>
                                <li><strong>Estado de conexión:</strong> Cuando el beacon se conecta o desconecta</li>
                                <li><strong>Alertas enviadas:</strong> Registro de alertas de emergencia enviadas con éxito</li>
                                <li><strong>Eventos del sistema:</strong> Batería baja, alertas de temperatura, detección de movimiento</li>
                            </ul>

                            <h3>1.5 Tokens e Identificadores</h3>
                            <ul>
                                <li><strong>Firebase UID:</strong> Identificador único de su cuenta en nuestros servidores</li>
                                <li><strong>Token FCM:</strong> Token de Firebase Cloud Messaging para enviar notificaciones push a su dispositivo</li>
                            </ul>

                            <h3>1.6 Datos de Diagnóstico y Rendimiento</h3>
                            <ul>
                                <li><strong>Reportes de errores:</strong> Si la aplicación falla, recopilamos información técnica (traza de error, modelo de dispositivo, versión del sistema) para mejorar la estabilidad</li>
                                <li><strong>Analíticas anonimizadas:</strong> Datos agregados sobre uso de la aplicación (sin identificar usuarios individuales)</li>
                            </ul>

                            <h2 id="es-uso-info">2. Cómo Usamos su Información</h2>

                            <h3>2.1 Propósito Principal - Servicio de Emergencias</h3>
                            <ul>
                                <li><strong>Enviar alertas de emergencia</strong> a sus contactos designados cuando presiona el botón del beacon</li>
                                <li><strong>Compartir su ubicación GPS</strong> en tiempo real durante emergencias</li>
                                <li><strong>Mantener el monitoreo 24/7</strong> para detectar presiones del botón incluso con el teléfono bloqueado</li>
                                <li><strong>Notificarle</strong> sobre el estado del servicio, conexión del beacon y batería baja</li>
                            </ul>

                            <h3>2.2 Propósitos Secundarios</h3>
                            <ul>
                                <li><strong>Autenticación:</strong> Verificar su identidad al iniciar sesión</li>
                                <li><strong>Soporte técnico:</strong> Diagnosticar y resolver problemas reportados</li>
                                <li><strong>Mejoras del servicio:</strong> Analizar patrones de uso para mejorar la aplicación</li>
                                <li><strong>Comunicaciones importantes:</strong> Enviar actualizaciones críticas sobre el servicio</li>
                                <li><strong>Cumplimiento legal:</strong> Cumplir con obligaciones legales y regulatorias</li>
                            </ul>

                            <h3>2.3 Lo que NO Hacemos</h3>
                            <div className="highlight">
                                <strong>Compromisos de privacidad:</strong>
                                <ul>
                                    <li>NO vendemos su información personal a terceros</li>
                                    <li>NO usamos sus datos para publicidad dirigida</li>
                                    <li>NO rastreamos su ubicación de forma continua (solo durante emergencias)</li>
                                    <li>NO compartimos sus datos con terceros para fines de marketing</li>
                                </ul>
                            </div>

                            <h2 id="es-compartir-info">3. Cómo Compartimos su Información</h2>

                            <h3>3.1 Con sus Contactos de Emergencia</h3>
                            <p>Cuando se activa una alerta de emergencia, compartimos la siguiente información con sus contactos designados:</p>
                            <ul>
                                <li>Su nombre</li>
                                <li>Su número de teléfono</li>
                                <li>Su ubicación GPS (coordenadas y/o enlace a mapa)</li>
                                <li>Tipo de emergencia (según el botón presionado)</li>
                            </ul>

                            <h3>3.2 Con Proveedores de Servicios</h3>
                            <p>Compartimos datos con los siguientes proveedores que nos ayudan a operar el servicio:</p>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Proveedor</th>
                                        <th>Servicio</th>
                                        <th>Datos Compartidos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Firebase (Google)</strong></td>
                                        <td>Autenticación, base de datos, notificaciones push, analíticas</td>
                                        <td>Perfil de usuario, eventos, tokens FCM</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Google Maps</strong></td>
                                        <td>Visualización de ubicación</td>
                                        <td>Coordenadas GPS durante emergencias</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Google Play Services</strong></td>
                                        <td>Servicios de ubicación</td>
                                        <td>Solicitudes de ubicación</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Servicios de automatización (webhooks)</strong></td>
                                        <td>Envío de SMS, WhatsApp y llamadas</td>
                                        <td>Datos de emergencia (nombre, teléfono, ubicación, contactos)</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Servidor de respaldo</strong></td>
                                        <td>Almacenamiento redundante y analíticas</td>
                                        <td>Eventos, perfil de usuario, reportes de errores</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>3.3 Por Requisitos Legales</h3>
                            <p>Podemos divulgar su información si es requerido por:</p>
                            <ul>
                                <li>Orden judicial o citación legal</li>
                                <li>Solicitud de autoridades gubernamentales</li>
                                <li>Para proteger nuestros derechos legales</li>
                                <li>Para prevenir fraude o actividades ilegales</li>
                                <li>En situaciones de emergencia que amenacen la vida de una persona</li>
                            </ul>

                            <h2 id="es-servicios-terceros">4. Servicios de Terceros</h2>

                            <p>FullTranki utiliza los siguientes servicios de terceros. Cada uno tiene su propia política de privacidad:</p>

                            <h3>4.1 Firebase (Google)</h3>
                            <ul>
                                <li><strong>Firebase Authentication:</strong> Manejo seguro de credenciales de cuenta</li>
                                <li><strong>Cloud Firestore:</strong> Base de datos para almacenar perfiles y eventos</li>
                                <li><strong>Firebase Cloud Messaging:</strong> Notificaciones push</li>
                                <li><strong>Firebase Analytics:</strong> Analíticas de uso anonimizadas</li>
                            </ul>
                            <p>Política de privacidad: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></p>

                            <h3>4.2 Google Maps Platform</h3>
                            <p>Usamos Google Maps para mostrar ubicaciones durante emergencias.</p>
                            <p>Política de privacidad: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></p>

                            <h3>4.3 KBeacon SDK (KKM)</h3>
                            <p>SDK para comunicación con el beacon KSensor vía Bluetooth Low Energy.</p>

                            <h2 id="es-almacenamiento">5. Almacenamiento y Seguridad</h2>

                            <h3>5.1 Dónde Almacenamos sus Datos</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ubicación</th>
                                        <th>Tipo de Datos</th>
                                        <th>Seguridad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Firebase/Google Cloud</strong></td>
                                        <td>Perfil de usuario, historial de eventos, tokens</td>
                                        <td>Encriptación en tránsito y en reposo, servidores certificados</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Servidor de respaldo</strong></td>
                                        <td>Copia de seguridad de eventos y perfiles</td>
                                        <td>HTTPS/TLS, acceso restringido</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Su dispositivo (local)</strong></td>
                                        <td>MAC del beacon, preferencias, cola de eventos offline</td>
                                        <td>SharedPreferences encriptadas, base de datos Room</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>5.2 Medidas de Seguridad</h3>
                            <ul>
                                <li><strong>Encriptación en tránsito:</strong> Todas las comunicaciones usan HTTPS/TLS</li>
                                <li><strong>Encriptación en reposo:</strong> Los datos en servidores están encriptados</li>
                                <li><strong>Autenticación segura:</strong> Firebase Authentication con estándares de la industria</li>
                                <li><strong>Control de acceso:</strong> Solo usted puede acceder a sus datos (basado en UID)</li>
                                <li><strong>Almacenamiento local seguro:</strong> SharedPreferences encriptadas en Android 12+</li>
                                <li><strong>Reglas de seguridad:</strong> Firestore Security Rules restringen acceso a datos propios</li>
                            </ul>

                            <h3>5.3 Cola de Eventos Offline</h3>
                            <p>Si pierde conexión a internet durante una emergencia:</p>
                            <ul>
                                <li>Los eventos se almacenan localmente en una base de datos segura</li>
                                <li>Se reintentan automáticamente cuando se restaura la conexión</li>
                                <li>Garantizamos cero pérdida de eventos de emergencia</li>
                            </ul>

                            <h2 id="es-retencion">6. Retención de Datos</h2>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Tipo de Dato</th>
                                        <th>Período de Retención</th>
                                        <th>Razón</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Perfil de usuario</strong></td>
                                        <td>Mientras la cuenta esté activa</td>
                                        <td>Necesario para operar el servicio</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Historial de emergencias</strong></td>
                                        <td>90 días por defecto</td>
                                        <td>Referencia para el usuario y soporte</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Datos de ubicación</strong></td>
                                        <td>Incluidos en eventos (90 días)</td>
                                        <td>Contexto de emergencias pasadas</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Tokens FCM</strong></td>
                                        <td>Mientras la cuenta esté activa</td>
                                        <td>Notificaciones push</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Analíticas</strong></td>
                                        <td>26 meses (anonimizadas)</td>
                                        <td>Mejora del servicio</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Reportes de errores</strong></td>
                                        <td>12 meses</td>
                                        <td>Diagnóstico y mejoras</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>6.1 Eliminación de Datos</h3>
                            <p>Cuando elimina su cuenta:</p>
                            <ul>
                                <li>Su perfil de usuario se elimina de Firebase</li>
                                <li>Su historial de eventos se elimina</li>
                                <li>Los datos locales en su dispositivo se borran al desinstalar la app</li>
                                <li>Los datos en servidores de respaldo se eliminan dentro de 30 días</li>
                                <li>Las analíticas anonimizadas pueden permanecer ya que no le identifican</li>
                            </ul>

                            <h2 id="es-derechos">7. Sus Derechos</h2>

                            <p>Usted tiene los siguientes derechos sobre sus datos personales:</p>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Derecho</th>
                                        <th>Descripción</th>
                                        <th>Cómo Ejercerlo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Acceso</strong></td>
                                        <td>Solicitar una copia de sus datos personales</td>
                                        <td>Email a contact@fulltranki.com</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Rectificación</strong></td>
                                        <td>Corregir datos inexactos o incompletos</td>
                                        <td>Editar en la app o contactarnos</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Eliminación</strong></td>
                                        <td>Solicitar la eliminación de su cuenta y datos</td>
                                        <td>Desde la app o email</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Portabilidad</strong></td>
                                        <td>Recibir sus datos en formato estructurado (JSON)</td>
                                        <td>Email a contact@fulltranki.com</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Oposición</strong></td>
                                        <td>Oponerse al procesamiento de sus datos</td>
                                        <td>Email a contact@fulltranki.com</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Restricción</strong></td>
                                        <td>Limitar cómo usamos sus datos</td>
                                        <td>Email a contact@fulltranki.com</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Retirar consentimiento</strong></td>
                                        <td>Retirar permisos otorgados previamente</td>
                                        <td>Configuración del dispositivo</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p><strong>Tiempo de respuesta:</strong> Responderemos a su solicitud dentro de 30 días. Podemos solicitar verificación de identidad.</p>

                            <h2 id="es-deletion-request">7.1 Solicitud de Eliminación de Cuenta</h2>

                            <div className="highlight">
                                <h3 style={{ marginTop: 0 }}>¿Cómo eliminar su cuenta y datos?</h3>
                                <p><strong>Para eliminar su cuenta, por favor envíe un correo electrónico a <a href="mailto:contact@fulltranki.com">contact@fulltranki.com</a> con el asunto "Solicitud de Eliminación de Cuenta" desde su correo electrónico registrado.</strong></p>

                                <p>Incluya la siguiente información en su solicitud:</p>
                                <ul>
                                    <li>Su nombre completo</li>
                                    <li>El correo electrónico asociado a su cuenta</li>
                                    <li>Confirmación de que desea eliminar permanentemente su cuenta y todos sus datos</li>
                                </ul>

                                <p><strong>Proceso de eliminación:</strong></p>
                                <ul>
                                    <li>Recibirá una confirmación por correo electrónico dentro de 48 horas</li>
                                    <li>Su cuenta y datos personales se eliminarán dentro de 30 días</li>
                                    <li>Recibirá una notificación final cuando la eliminación se complete</li>
                                    <li>Los datos en servidores de respaldo se eliminarán dentro de 30 días adicionales</li>
                                </ul>

                                <p><strong>Nota importante:</strong> La eliminación de su cuenta es permanente e irreversible. Una vez eliminada, no podrá recuperar sus datos ni su historial de emergencias.</p>
                            </div>

                            <h2 id="es-permisos">8. Permisos de la Aplicación</h2>

                            <p>FullTranki solicita los siguientes permisos en Android. Todos son necesarios para el funcionamiento del servicio de emergencias:</p>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Permiso</th>
                                        <th>Propósito</th>
                                        <th>Consecuencia si se Niega</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Ubicación precisa (GPS)</strong></td>
                                        <td>Capturar coordenadas para compartir en emergencias</td>
                                        <td>No se podrá enviar ubicación a contactos</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ubicación en segundo plano</strong></td>
                                        <td>Detectar emergencias con la app cerrada</td>
                                        <td>El servicio no funcionará correctamente</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Bluetooth</strong></td>
                                        <td>Conectar con el beacon KSensor</td>
                                        <td>No se podrá usar el beacon</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Notificaciones</strong></td>
                                        <td>Mostrar estado del servicio y alertas</td>
                                        <td>No recibirá confirmaciones</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Inicio automático</strong></td>
                                        <td>Reiniciar monitoreo tras reiniciar el teléfono</td>
                                        <td>Deberá abrir la app manualmente</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Sin optimización de batería</strong></td>
                                        <td>Mantener el servicio activo 24/7</td>
                                        <td>El sistema puede cerrar la app</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Alarmas exactas</strong></td>
                                        <td>Programar verificaciones del servicio</td>
                                        <td>Menor confiabilidad del servicio</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Pantalla completa</strong></td>
                                        <td>Mostrar alertas sobre pantalla de bloqueo</td>
                                        <td>Alertas menos visibles</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h2 id="es-menores">9. Menores de Edad</h2>

                            <div className="warning">
                                FullTranki está diseñado exclusivamente para <strong>personas mayores de 18 años</strong> y sus cuidadores.
                            </div>

                            <ul>
                                <li>No recopilamos intencionalmente información de menores de 13 años</li>
                                <li>La aplicación no está dirigida ni diseñada para uso por menores</li>
                                <li>Si descubrimos que hemos recopilado datos de un menor de 13 años, los eliminaremos inmediatamente</li>
                                <li>Si es padre/tutor y cree que su hijo nos ha proporcionado datos, contáctenos a <a href="mailto:contact@fulltranki.com">contact@fulltranki.com</a></li>
                            </ul>

                            <h2 id="es-internacional">10. Transferencias Internacionales de Datos</h2>

                            <p>Sus datos pueden ser transferidos y procesados en servidores ubicados fuera de su país de residencia, incluyendo:</p>

                            <ul>
                                <li><strong>Estados Unidos:</strong> Servidores de Google Cloud/Firebase</li>
                                <li><strong>Unión Europea:</strong> Algunos servicios de infraestructura</li>
                            </ul>

                            <p>Estas transferencias se realizan bajo las siguientes salvaguardas:</p>
                            <ul>
                                <li>Cláusulas Contractuales Estándar de la UE</li>
                                <li>Marco de Privacidad de Datos UE-EE.UU. (donde aplique)</li>
                                <li>Acuerdos de procesamiento de datos con proveedores</li>
                            </ul>

                            <h2 id="es-gdpr">11. Base Legal para el Procesamiento (GDPR - Unión Europea)</h2>

                            <p>Para usuarios en la Unión Europea y el Espacio Económico Europeo, procesamos sus datos bajo las siguientes bases legales:</p>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Base Legal</th>
                                        <th>Datos/Propósito</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Consentimiento (Art. 6.1.a)</strong></td>
                                        <td>Recopilación y compartición de ubicación, notificaciones push</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ejecución de contrato (Art. 6.1.b)</strong></td>
                                        <td>Prestación del servicio de alertas de emergencia</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Interés legítimo (Art. 6.1.f)</strong></td>
                                        <td>Mejora del servicio, prevención de fraude, seguridad</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Obligación legal (Art. 6.1.c)</strong></td>
                                        <td>Cumplimiento de requisitos legales y regulatorios</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Intereses vitales (Art. 6.1.d)</strong></td>
                                        <td>Procesamiento de alertas de emergencia para proteger la vida</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p><strong>Derechos adicionales GDPR:</strong></p>
                            <ul>
                                <li>Derecho a presentar una queja ante su autoridad de protección de datos local</li>
                                <li>Derecho a no ser sujeto de decisiones automatizadas</li>
                            </ul>

                            <h2 id="es-cambios">12. Cambios a esta Política de Privacidad</h2>

                            <p>Podemos actualizar esta política de privacidad ocasionalmente. Cuando hagamos cambios:</p>

                            <ul>
                                <li>Actualizaremos la fecha de "Última actualización" al inicio del documento</li>
                                <li>Para cambios significativos, le notificaremos a través de la aplicación o por correo electrónico</li>
                                <li>Le recomendamos revisar esta política periódicamente</li>
                            </ul>

                            <p>El uso continuado de la aplicación después de cambios constituye aceptación de la política actualizada.</p>

                            <div className="contact" id="es-contacto">
                                <h2>13. Contacto</h2>
                                <p>Si tiene preguntas, comentarios o solicitudes relacionadas con esta política de privacidad o el manejo de sus datos personales:</p>

                                <table>
                                    <tbody>
                                        <tr>
                                            <td><strong>Empresa</strong></td>
                                            <td>MEGA DEEP ANALYTICS SAS</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Aplicación</strong></td>
                                            <td>FullTranki</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Email de contacto</strong></td>
                                            <td><a href="mailto:contact@fulltranki.com">contact@fulltranki.com</a></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Sitio web</strong></td>
                                            <td><a href="https://fulltranki.com" target="_blank" rel="noopener noreferrer">https://fulltranki.com</a></td>
                                        </tr>
                                    </tbody>
                                </table>

                                <p style={{ marginTop: '20px' }}><strong>Tiempo de respuesta:</strong> Respondemos a todas las solicitudes dentro de 30 días calendario.</p>
                            </div>

                            <hr style={{ marginTop: '50px', border: 'none', borderTop: '2px solid #eee' }} />

                            <div style={{ textAlign: 'center', color: '#666', fontSize: '14px', padding: '30px 0' }}>
                                <p><strong>FullTranki</strong> - Sistema de Alertas Médicas de Emergencia</p>
                                <p>&copy; 2026 MEGA DEEP ANALYTICS SAS. Todos los derechos reservados.</p>
                            </div>

                        </div>
                    )
                }

                {/* ==================== ENGLISH VERSION ==================== */}
                {
                    lang === 'en' && (
                        <div className="lang-en">

                            <h1>Privacy Policy</h1>
                            <p className="date">Last updated: February 5, 2026</p>
                            <p className="date">Effective: February 5, 2026</p>

                            <div className="highlight">
                                <strong>FullTranki</strong> ("we", "our", "the app" or "the service") is an emergency medical alert system developed by <strong>MEGA DEEP ANALYTICS SAS</strong>. This privacy policy explains clearly and transparently how we collect, use, store, share, and protect your personal information when you use our Android mobile application.
                                <br /><br />
                                <strong>By using FullTranki, you agree to the practices described in this policy.</strong>
                            </div>

                            <div className="toc">
                                <h3>Table of Contents</h3>
                                <ol>
                                    <li><a href="#en-info-collected">Information We Collect</a></li>
                                    <li><a href="#en-use-info">How We Use Your Information</a></li>
                                    <li><a href="#en-share-info">How We Share Your Information</a></li>
                                    <li><a href="#en-third-party">Third-Party Services</a></li>
                                    <li><a href="#en-storage">Storage and Security</a></li>
                                    <li><a href="#en-retention">Data Retention</a></li>
                                    <li><a href="#en-rights">Your Rights</a></li>
                                    <li><a href="#en-deletion-request">Account Deletion Request</a></li>
                                    <li><a href="#en-permissions">App Permissions</a></li>
                                    <li><a href="#en-children">Children's Privacy</a></li>
                                    <li><a href="#en-international">International Transfers</a></li>
                                    <li><a href="#en-gdpr">Legal Basis (GDPR/EU)</a></li>
                                    <li><a href="#en-changes">Changes to This Policy</a></li>
                                    <li><a href="#en-contact">Contact</a></li>
                                </ol>
                            </div>

                            <h2 id="en-info-collected">1. Information We Collect</h2>

                            <p>We collect different types of information to provide and improve our emergency alert service. Below is a detailed breakdown of each category:</p>

                            <h3>1.1 Personal Information (Provided by You)</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Purpose</th>
                                        <th>Required</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Full name</strong></td>
                                        <td>Identify your account and personalize emergency alerts</td>
                                        <td><span className="badge badge-required">Required</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Email address</strong></td>
                                        <td>Account authentication and password recovery</td>
                                        <td><span className="badge badge-required">Required</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Phone number</strong></td>
                                        <td>Identification in emergency alerts</td>
                                        <td><span className="badge badge-required">Required</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Emergency contact 1</strong></td>
                                        <td>Name and phone of primary contact to receive alerts</td>
                                        <td><span className="badge badge-required">Required</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Emergency contact 2</strong></td>
                                        <td>Name and phone of secondary contact</td>
                                        <td><span className="badge badge-optional">Optional</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Health center</strong></td>
                                        <td>Name and phone of medical facility for alerts</td>
                                        <td><span className="badge badge-optional">Optional</span></td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>1.2 Location Data</h3>
                            <div className="warning">
                                <strong>Important:</strong> Location is essential for the emergency service to function.
                            </div>
                            <ul>
                                <li><strong>Precise location (GPS):</strong> We capture your geographic coordinates (latitude and longitude) when an emergency alert is triggered. This location is shared with your emergency contacts so they can locate you.</li>
                                <li><strong>Background location:</strong> The app accesses your location even when not in active use. This is essential for sending your location during emergencies that are automatically detected by the beacon.</li>
                            </ul>

                            <h3>1.3 Device and Beacon Information</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Purpose</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Beacon MAC address</strong></td>
                                        <td>Uniquely identify and pair your KSensor device</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Beacon UUID, Major, Minor</strong></td>
                                        <td>iBeacon identification configuration</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Beacon battery level</strong></td>
                                        <td>Alert you when the battery is low</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Signal strength (RSSI)</strong></td>
                                        <td>Determine proximity and connection quality</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Sensor data</strong></td>
                                        <td>Ambient temperature, accelerometer data (movement/step detection)</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Android device model</strong></td>
                                        <td>Technical support and error reports</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Android version</strong></td>
                                        <td>Compatibility and technical support</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>1.4 App Activity Data</h3>
                            <ul>
                                <li><strong>Event history:</strong> We record each time you press the beacon button (press type, date/time)</li>
                                <li><strong>Connection status:</strong> When the beacon connects or disconnects</li>
                                <li><strong>Alerts sent:</strong> Record of successfully sent emergency alerts</li>
                                <li><strong>System events:</strong> Low battery, temperature alerts, movement detection</li>
                            </ul>

                            <h3>1.5 Tokens and Identifiers</h3>
                            <ul>
                                <li><strong>Firebase UID:</strong> Unique identifier for your account on our servers</li>
                                <li><strong>FCM Token:</strong> Firebase Cloud Messaging token to send push notifications to your device</li>
                            </ul>

                            <h3>1.6 Diagnostic and Performance Data</h3>
                            <ul>
                                <li><strong>Error reports:</strong> If the app crashes, we collect technical information (error trace, device model, system version) to improve stability</li>
                                <li><strong>Anonymized analytics:</strong> Aggregated data about app usage (without identifying individual users)</li>
                            </ul>

                            <h2 id="en-use-info">2. How We Use Your Information</h2>

                            <h3>2.1 Primary Purpose - Emergency Service</h3>
                            <ul>
                                <li><strong>Send emergency alerts</strong> to your designated contacts when you press the beacon button</li>
                                <li><strong>Share your GPS location</strong> in real-time during emergencies</li>
                                <li><strong>Maintain 24/7 monitoring</strong> to detect button presses even with the phone locked</li>
                                <li><strong>Notify you</strong> about service status, beacon connection, and low battery</li>
                            </ul>

                            <h3>2.2 Secondary Purposes</h3>
                            <ul>
                                <li><strong>Authentication:</strong> Verify your identity when logging in</li>
                                <li><strong>Technical support:</strong> Diagnose and resolve reported issues</li>
                                <li><strong>Service improvements:</strong> Analyze usage patterns to improve the app</li>
                                <li><strong>Important communications:</strong> Send critical service updates</li>
                                <li><strong>Legal compliance:</strong> Comply with legal and regulatory obligations</li>
                            </ul>

                            <h3>2.3 What We Do NOT Do</h3>
                            <div className="highlight">
                                <strong>Privacy commitments:</strong>
                                <ul>
                                    <li>We do NOT sell your personal information to third parties</li>
                                    <li>We do NOT use your data for targeted advertising</li>
                                    <li>We do NOT continuously track your location (only during emergencies)</li>
                                    <li>We do NOT share your data with third parties for marketing purposes</li>
                                </ul>
                            </div>

                            <h2 id="en-share-info">3. How We Share Your Information</h2>

                            <h3>3.1 With Your Emergency Contacts</h3>
                            <p>When an emergency alert is triggered, we share the following information with your designated contacts:</p>
                            <ul>
                                <li>Your name</li>
                                <li>Your phone number</li>
                                <li>Your GPS location (coordinates and/or map link)</li>
                                <li>Type of emergency (based on the button pressed)</li>
                            </ul>

                            <h3>3.2 With Service Providers</h3>
                            <p>We share data with the following providers that help us operate the service:</p>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Provider</th>
                                        <th>Service</th>
                                        <th>Data Shared</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Firebase (Google)</strong></td>
                                        <td>Authentication, database, push notifications, analytics</td>
                                        <td>User profile, events, FCM tokens</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Google Maps</strong></td>
                                        <td>Location visualization</td>
                                        <td>GPS coordinates during emergencies</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Google Play Services</strong></td>
                                        <td>Location services</td>
                                        <td>Location requests</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Automation services (webhooks)</strong></td>
                                        <td>Sending SMS, WhatsApp, and calls</td>
                                        <td>Emergency data (name, phone, location, contacts)</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Backup server</strong></td>
                                        <td>Redundant storage and analytics</td>
                                        <td>Events, user profile, error reports</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>3.3 For Legal Requirements</h3>
                            <p>We may disclose your information if required by:</p>
                            <ul>
                                <li>Court order or legal subpoena</li>
                                <li>Government authority request</li>
                                <li>To protect our legal rights</li>
                                <li>To prevent fraud or illegal activities</li>
                                <li>In emergency situations threatening a person's life</li>
                            </ul>

                            <h2 id="en-third-party">4. Third-Party Services</h2>

                            <p>FullTranki uses the following third-party services. Each has its own privacy policy:</p>

                            <h3>4.1 Firebase (Google)</h3>
                            <ul>
                                <li><strong>Firebase Authentication:</strong> Secure account credential management</li>
                                <li><strong>Cloud Firestore:</strong> Base de datos para almacenar perfiles y eventos</li>
                                <li><strong>Firebase Cloud Messaging:</strong> Push notifications</li>
                                <li><strong>Firebase Analytics:</strong> Anonymized usage analytics</li>
                            </ul>
                            <p>Privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></p>

                            <h3>4.2 Google Maps Platform</h3>
                            <p>We use Google Maps to display locations during emergencies.</p>
                            <p>Privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></p>

                            <h3>4.3 KBeacon SDK (KKM)</h3>
                            <p>SDK for communication with the KSensor beacon via Bluetooth Low Energy.</p>

                            <h2 id="en-storage">5. Storage and Security</h2>

                            <h3>5.1 Where We Store Your Data</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Location</th>
                                        <th>Data Type</th>
                                        <th>Security</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Firebase/Google Cloud</strong></td>
                                        <td>User profile, event history, tokens</td>
                                        <td>Encryption in transit and at rest, certified servers</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Backup server</strong></td>
                                        <td>Backup of events and profiles</td>
                                        <td>HTTPS/TLS, restricted access</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Your device (local)</strong></td>
                                        <td>Beacon MAC, preferences, offline event queue</td>
                                        <td>Encrypted SharedPreferences, Room database</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>5.2 Security Measures</h3>
                            <ul>
                                <li><strong>Encryption in transit:</strong> All communications use HTTPS/TLS</li>
                                <li><strong>Encryption at rest:</strong> Data on servers is encrypted</li>
                                <li><strong>Secure authentication:</strong> Firebase Authentication with industry standards</li>
                                <li><strong>Access control:</strong> Only you can access your data (UID-based)</li>
                                <li><strong>Secure local storage:</strong> Encrypted SharedPreferences on Android 12+</li>
                                <li><strong>Security rules:</strong> Firestore Security Rules restrict access to your own data</li>
                            </ul>

                            <h3>5.3 Offline Event Queue</h3>
                            <p>If you lose internet connection during an emergency:</p>
                            <ul>
                                <li>Events are stored locally in a secure database</li>
                                <li>They are automatically retried when the connection is restored</li>
                                <li>We guarantee zero loss of emergency events</li>
                            </ul>

                            <h2 id="en-retention">6. Data Retention</h2>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Data Type</th>
                                        <th>Retention Period</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>User profile</strong></td>
                                        <td>While account is active</td>
                                        <td>Required to operate the service</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Emergency history</strong></td>
                                        <td>90 days by default</td>
                                        <td>Reference for user and support</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Location data</strong></td>
                                        <td>Included in events (90 days)</td>
                                        <td>Context for past emergencies</td>
                                    </tr>
                                    <tr>
                                        <td><strong>FCM tokens</strong></td>
                                        <td>While account is active</td>
                                        <td>Push notifications</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Analytics</strong></td>
                                        <td>26 months (anonymized)</td>
                                        <td>Service improvement</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Error reports</strong></td>
                                        <td>12 months</td>
                                        <td>Diagnostics and improvements</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3>6.1 Data Deletion</h3>
                            <p>When you delete your account:</p>
                            <ul>
                                <li>Your user profile is deleted from Firebase</li>
                                <li>Your event history is deleted</li>
                                <li>Local data on your device is erased when you uninstall the app</li>
                                <li>Data on backup servers is deleted within 30 days</li>
                                <li>Anonymized analytics may remain as they do not identify you</li>
                            </ul>

                            <h2 id="en-rights">7. Your Rights</h2>

                            <p>You have the following rights regarding your personal data:</p>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Right</th>
                                        <th>Description</th>
                                        <th>How to Exercise</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Access</strong></td>
                                        <td>Request a copy of your personal data</td>
                                        <td>Email contact@fulltranki.com</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Rectification</strong></td>
                                        <td>Correct inaccurate or incomplete data</td>
                                        <td>Edit in the app or contact us</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Deletion</strong></td>
                                        <td>Request deletion of your account and data</td>
                                        <td>From the app or by email</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Portability</strong></td>
                                        <td>Receive your data in structured format (JSON)</td>
                                        <td>Email contact@fulltranki.com</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Objection</strong></td>
                                        <td>Object to processing of your data</td>
                                        <td>Email contact@fulltranki.com</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Restriction</strong></td>
                                        <td>Limit how we use your data</td>
                                        <td>Email contact@fulltranki.com</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Withdraw consent</strong></td>
                                        <td>Withdraw previously granted permissions</td>
                                        <td>Device settings</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p><strong>Response time:</strong> We will respond to your request within 30 days. We may request identity verification.</p>

                            <h2 id="en-deletion-request">7.1 Account Deletion Request</h2>

                            <div className="highlight">
                                <h3 style={{ marginTop: 0 }}>How to Delete Your Account and Data</h3>
                                <p><strong>To delete your account, please email <a href="mailto:contact@fulltranki.com">contact@fulltranki.com</a> with the subject "Account Deletion Request" from your registered email.</strong></p>

                                <p>Please include the following information in your request:</p>
                                <ul>
                                    <li>Your full name</li>
                                    <li>The email address associated with your account</li>
                                    <li>Confirmation that you want to permanently delete your account and all your data</li>
                                </ul>

                                <p><strong>Deletion process:</strong></p>
                                <ul>
                                    <li>You will receive a confirmation email within 48 hours</li>
                                    <li>Your account and personal data will be deleted within 30 days</li>
                                    <li>You will receive a final notification when the deletion is complete</li>
                                    <li>Data on backup servers will be deleted within an additional 30 days</li>
                                </ul>

                                <p><strong>Important note:</strong> Account deletion is permanent and irreversible. Once deleted, you will not be able to recover your data or emergency history.</p>
                            </div>

                            <h2 id="en-permissions">8. App Permissions</h2>

                            <p>FullTranki requests the following Android permissions. All are necessary for the emergency service to function:</p>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Permission</th>
                                        <th>Purpose</th>
                                        <th>Consequence if Denied</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Precise location (GPS)</strong></td>
                                        <td>Capture coordinates to share in emergencies</td>
                                        <td>Cannot send location to contacts</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Background location</strong></td>
                                        <td>Detect emergencies with the app closed</td>
                                        <td>Service will not work properly</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Bluetooth</strong></td>
                                        <td>Connect with the KSensor beacon</td>
                                        <td>Cannot use the beacon</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Notifications</strong></td>
                                        <td>Show service status and alerts</td>
                                        <td>Will not receive confirmations</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Auto-start</strong></td>
                                        <td>Restart monitoring after phone reboot</td>
                                        <td>Must open the app manually</td>
                                    </tr>
                                    <tr>
                                        <td><strong>No battery optimization</strong></td>
                                        <td>Keep service active 24/7</td>
                                        <td>System may close the app</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Exact alarms</strong></td>
                                        <td>Schedule service checks</td>
                                        <td>Less reliable service</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Full screen</strong></td>
                                        <td>Show alerts over lock screen</td>
                                        <td>Less visible alerts</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h2 id="en-children">9. Children's Privacy</h2>

                            <div className="warning">
                                FullTranki is designed exclusively for <strong>adults 18 years of age and older</strong> and their caregivers.
                            </div>

                            <ul>
                                <li>We do not intentionally collect information from children under 13</li>
                                <li>The app is not directed at or designed for use by minors</li>
                                <li>If we discover we have collected data from a child under 13, we will delete it immediately</li>
                                <li>If you are a parent/guardian and believe your child has provided us with data, contact us at <a href="mailto:contact@fulltranki.com">contact@fulltranki.com</a></li>
                            </ul>

                            <h2 id="en-international">10. International Data Transfers</h2>

                            <p>Your data may be transferred and processed on servers located outside your country of residence, including:</p>

                            <ul>
                                <li><strong>United States:</strong> Google Cloud/Firebase servers</li>
                                <li><strong>European Union:</strong> Some infrastructure services</li>
                            </ul>

                            <p>These transfers are made under the following safeguards:</p>
                            <ul>
                                <li>Cláusulas Contractuales Estándar de la UE</li>
                                <li>Marco de Privacidad de Datos UE-EE.UU. (donde aplique)</li>
                                <li>Acuerdos de procesamiento de datos con proveedores</li>
                            </ul>

                            <h2 id="en-gdpr">11. Legal Basis for Processing (GDPR - European Union)</h2>

                            <p>For users in the European Union and European Economic Area, we process your data under the following legal bases:</p>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Legal Basis</th>
                                        <th>Data/Purpose</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Consent (Art. 6.1.a)</strong></td>
                                        <td>Collection and sharing of location, push notifications</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Contract performance (Art. 6.1.b)</strong></td>
                                        <td>Provision of emergency alert service</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Legitimate interest (Art. 6.1.f)</strong></td>
                                        <td>Service improvement, fraud prevention, security</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Legal obligation (Art. 6.1.c)</strong></td>
                                        <td>Compliance with legal and regulatory requirements</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Vital interests (Art. 6.1.d)</strong></td>
                                        <td>Processing emergency alerts to protect life</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p><strong>Additional GDPR rights:</strong></p>
                            <ul>
                                <li>Right to lodge a complaint with your local data protection authority</li>
                                <li>Right not to be subject to automated decisions</li>
                            </ul>

                            <h2 id="en-changes">12. Changes to This Privacy Policy</h2>

                            <p>We may update this privacy policy occasionally. When we make changes:</p>

                            <ul>
                                <li>We will update the "Last updated" date at the top of this document</li>
                                <li>For significant changes, we will notify you through the app or by email</li>
                                <li>We recommend reviewing this policy periodically</li>
                            </ul>

                            <p>Continued use of the app after changes constitutes acceptance of the updated policy.</p>

                            <div className="contact" id="en-contact">
                                <h2>13. Contact</h2>
                                <p>If you have questions, comments, or requests related to this privacy policy or the handling of your personal data:</p>

                                <table>
                                    <tbody>
                                        <tr>
                                            <td><strong>Company</strong></td>
                                            <td>MEGA DEEP ANALYTICS SAS</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Application</strong></td>
                                            <td>FullTranki</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Contact email</strong></td>
                                            <td><a href="mailto:contact@fulltranki.com">contact@fulltranki.com</a></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Website</strong></td>
                                            <td><a href="https://fulltranki.com" target="_blank" rel="noopener noreferrer">https://fulltranki.com</a></td>
                                        </tr>
                                    </tbody>
                                </table>

                                <p style={{ marginTop: '20px' }}><strong>Response time:</strong> We respond to all requests within 30 calendar days.</p>
                            </div>

                            <hr style={{ marginTop: '50px', border: 'none', borderTop: '2px solid #eee' }} />

                            <div style={{ textAlign: 'center', color: '#666', fontSize: '14px', padding: '30px 0' }}>
                                <p><strong>FullTranki</strong> - Emergency Medical Alert System</p>
                                <p>&copy; 2026 MEGA DEEP ANALYTICS SAS. All rights reserved.</p>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}
