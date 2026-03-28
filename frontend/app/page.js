"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Shield, Heart, Clock, Activity, CheckCircle, Smartphone, Globe } from 'lucide-react';

const TRANSLATIONS = {
    es: {
        nav: {
            privacy: "Privacidad",
            login: "Iniciar Sesión",
        },
        hero: {
            title: <>¿Y SI PUEDES <br /> GENERAR <span className="text-[#202d35] dark:text-[#ccff00]">TRANQUILIDAD</span> <br /> Y <span className="text-[#202d35] dark:text-[#ccff00]">SEGURIDAD</span> <br /> JUSTO CUANDO <br /> MÁS SE NECESITA?</>,
            button: "Ingresar al Sistema",
        },
        problem: {
            title1: <>Aunque tengan la tecnología, en los momentos claves <span className="text-[#202d35] dark:text-[#ccff00]">no siempre saben o pueden usarla.</span></>,
            title2: <><span className="text-[#202d35] dark:text-[#ccff00]">Ahí es cuando más necesitan apoyo... porque cada minuto cuenta.</span></>,
        },
        ecosystem: {
            title: <>CONTAR CON UN <span className="text-[#202d35] dark:text-[#ccff00]">ECOSISTEMA</span> QUE ALERTE A TUS CONTACTOS ES CLAVE</>,
            features: [
                { title: "ACTUAR RÁPIDO", desc: "Notifica de inmediato en situaciones críticas." },
                { title: "VARIOS MECANISMOS", desc: "Funciona cuando otros medios no están a la mano." },
                { title: "SENCILLO", desc: "Ideal para personas vulnerables, fácil de usar bajo presión." },
                { title: "TRANQUILIDAD", desc: "Asegura apoyo y paz mental para ti y los tuyos." }
            ]
        },
        help: {
            title: <>COMO TE VAMOS A <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-black dark:from-white dark:to-gray-500">AYUDAR</span></>,
            accompany: { title: "ACOMPAÑARTE", subtitle: "En el momento preciso", desc: "Al momento de necesitarlo, podrás generar la alerta con un solo toque." },
            update: { title: "ACTUALIZARTE", subtitle: "En todo momento", desc: "Monitorea temperatura y valida la atención de alarmas." },
        },
        steps: {
            items: [
                "Descargas el App.",
                "Obtienes el brazalete.",
                "Ingresas la información básica.",
                "Escoges el plan que más te convenga.",
                "Empiezas a estar protegido."
            ],
            noti: "Notificación de alerta",
            app: "App interface"
        },
        plans: {
            title: "DARTE LAS OPCIONES ADECUADAS",
            subtitle: "Dependiendo de tus necesidades, brindarte los planes de inversión:",
            items: [
                { title: "EASY", desc: "Incluye dispositivo + app. Envía alertas a un contacto de confianza." },
                { title: "SOLID", desc: "Además de EASY, llamadas y si tu contacto no responde, nuestro call center con IA te ayuda y canaliza lo necesario." },
                { title: "BOOST", desc: "Incluye SOLID + Asistencia medica remota y envío de personal de asistencia medica a tu domicilio según la urgencia presentada." },
                { title: "ULTRA", desc: "Todo lo anterior + IA + ambulancia, acompañamiento psicológico y atención médica en casa y/o telefónica." }
            ]
        },
        footer: {
            rights: "© 2026 FullTranki es un producto de MEGA DEEP ANALYTICS SAS. Todos los derechos reservados.",
            privacy: "Política de Privacidad",
            terms: "Términos de servicio"
        }
    },
    en: {
        nav: {
            privacy: "Privacy",
            login: "Login",
        },
        hero: {
            title: <>WHAT IF YOU <br /> COULD GENERATE <span className="text-[#202d35] dark:text-[#ccff00]">PEACE OF MIND</span> <br /> AND <span className="text-[#202d35] dark:text-[#ccff00]">SECURITY</span> <br /> JUST WHEN IT'S <br /> NEEDED MOST?</>,
            button: "Enter System",
        },
        problem: {
            title1: <>Even if they have the technology, at key moments <span className="text-[#202d35] dark:text-[#ccff00]">they don't always know or can't use it.</span></>,
            title2: <><span className="text-[#202d35] dark:text-[#ccff00]">That's when they need support most... because every minute counts.</span></>,
        },
        ecosystem: {
            title: <>HAVING AN <span className="text-[#202d35] dark:text-[#ccff00]">ECOSYSTEM</span> THAT ALERTS YOUR CONTACTS IS KEY</>,
            features: [
                { title: "ACT FAST", desc: "Notifies immediately in critical situations." },
                { title: "MULTIPLE MECHANISMS", desc: "Works when other means are not at hand." },
                { title: "SIMPLE", desc: "Ideal for vulnerable people, easy to use under pressure." },
                { title: "PEACE OF MIND", desc: "Ensures support and peace of mind for you and yours." }
            ]
        },
        help: {
            title: <>HOW WE ARE GOING TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-black dark:from-white dark:to-gray-500">HELP YOU</span></>,
            accompany: { title: "ACCOMPANY YOU", subtitle: "At the precise moment", desc: "When you need it, you can generate the alert with a single touch." },
            update: { title: "UPDATE YOU", subtitle: "At all times", desc: "Monitor temperature and validate alarm attention." },
        },
        steps: {
            items: [
                "Download the App.",
                "Get the bracelet.",
                "Enter basic information.",
                "Choose the plan that suits you best.",
                "Start being protected."
            ],
            noti: "Alert notification",
            app: "App interface"
        },
        plans: {
            title: "GIVING YOU THE RIGHT OPTIONS",
            subtitle: "Depending on your needs, providing you with investment plans:",
            items: [
                { title: "EASY", desc: "Includes device + app. Sends alerts to a trusted contact." },
                { title: "SOLID", desc: "In addition to EASY, calls and if your contact does not respond, our AI call center helps you and channels what is necessary." },
                { title: "BOOST", desc: "Includes SOLID + Remote medical assistance and dispatch of medical assistance personnel to your home according to the urgency presented." },
                { title: "ULTRA", desc: "All of the above + AI + ambulance, psychological accompaniment and home and/or telephone medical care." }
            ]
        },
        footer: {
            rights: "© 2026 FullTranki is a product of MEGA DEEP ANALYTICS SAS. All rights reserved.",
            privacy: "Privacy Policy",
            terms: "Terms of Service"
        }
    }
};

export default function LandingPage() {
    const [lang, setLang] = useState('es');
    const t = TRANSLATIONS[lang];

    useEffect(() => {
        // Load language preference
        const savedLang = localStorage.getItem('lang');
        if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
            setLang(savedLang);
        }
    }, []);

    const isDark = true;

    const toggleLang = () => {
        const newLang = lang === 'es' ? 'en' : 'es';
        setLang(newLang);
        localStorage.setItem('lang', newLang);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans selection:bg-[#ccff00] selection:text-black scroll-smooth transition-colors duration-300">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-black/10 dark:border-white/10">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
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
                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Language Toggle */}
                        <button
                            onClick={toggleLang}
                            className="flex items-center gap-2 p-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-[#ccff00]/50 transition-all group"
                            aria-label="Toggle language"
                        >
                            <Globe className="w-4 h-4 text-gray-400 group-hover:text-[#ccff00] transition-colors" />
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">
                                {lang === 'es' ? 'EN' : 'ES'}
                            </span>
                        </button>


                        <Link href="/privacy-policy" className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors hidden md:block">
                            {t.nav.privacy}
                        </Link>
                        <Link
                            href="/login"
                            className="px-6 py-2.5 bg-[#ccff00] text-black font-bold rounded-full hover:bg-[#bbe600] transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(204,255,0,0.3)]"
                        >
                            {t.nav.login}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center overflow-hidden py-20 md:py-0">
                {/* Background Image */}
                <div className="absolute inset-0 z-0 hidden md:block">
                    <Image
                        src="/images/inicio2.png"
                        alt="Background"
                        fill
                        className="object-cover object-[70%_center] opacity-100 dark:opacity-100"
                        priority
                    />
                    {/* Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent dark:from-black/90 dark:via-black/50 dark:to-transparent"></div>
                </div>

                <div className="container mx-auto px-6 pb-12 relative z-10 min-h-full flex flex-col justify-center pt-28 md:pt-20">
                    <div className="max-w-3xl text-center md:text-left">
                        <h1 className="text-4xl md:text-7xl font-bold leading-tight md:leading-none mb-6 tracking-tight uppercase">
                            {t.hero.title}
                        </h1>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <Link
                                href="/login"
                                className="group px-8 py-4 bg-[#ccff00] text-black font-bold rounded-full hover:bg-[#bbe600] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(204,255,0,0.4)] hover:scale-105 active:scale-95"
                            >
                                {t.hero.button}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Statement Section */}
            <section className="bg-white dark:bg-[#0a0a0a] py-24 transition-colors duration-300">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
                            <Image
                                src="/images/adultos.png"
                                alt="Adultos Mayores"
                                fill
                                className="object-cover hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                        <div>
                            <h2 className="text-[#202d35] dark:text-white text-3xl md:text-5xl font-bold mb-8 leading-tight">
                                {t.problem.title1}
                            </h2>
                            <div className="space-y-6 text-lg">
                                <h2 className="text-[#202d35] dark:text-white text-3xl md:text-5xl font-bold mb-8 leading-tight">
                                    {t.problem.title2}
                                </h2>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Solution / Ecosystem */}
            <section className="py-24 relative bg-gray-50 dark:bg-transparent transition-colors duration-300">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                            {t.ecosystem.title}
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {t.ecosystem.features.map((f, i) => (
                            <FeatureCard
                                key={i}
                                icon={[<Activity />, <Smartphone />, <CheckCircle />, <Heart />][i]}
                                title={f.title}
                                desc={f.desc}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Value Proposition */}
            <section className="bg-white dark:bg-[#0a0a0a] py-24 transition-colors duration-300">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter drop-shadow-xl text-black dark:text-white text-center">
                            {t.help.title}
                        </h2>
                    </div>

                    {/* Desktop/Tablet Layout */}
                    <div className="relative w-full max-w-[1600px] mx-auto aspect-[21/9] lg:aspect-[16/9] hidden md:block group">
                        <div className="absolute inset-0 rounded-3xl overflow-hidden border border-black/5 dark:border-white/10 shadow-2xl z-0">
                            <Image
                                src="/images/help.png"
                                alt="Ayuda"
                                fill
                                className="object-cover opacity-100 dark:opacity-80 transition-opacity duration-300"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent dark:from-black/60 dark:to-transparent"></div>
                        </div>

                        {/* Card 1 */}
                        <div className="absolute top-[10%] left-[2%] lg:left-[5%] w-[280px] h-[180px] p-6 rounded-2xl bg-white/90 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 hover:border-[#202d35]/50 dark:hover:border-[#ccff00]/50 transition-all z-10 shadow-xl">
                            <h3 className="text-xl font-bold mb-2 group-hover:text-[#202d35] dark:group-hover:text-[#ccff00] transition-colors">{t.help.accompany.title}</h3>
                            <p className="text-[10px] font-bold tracking-widest text-[#202d35] dark:text-[#ccff00] mb-3 uppercase">{t.help.accompany.subtitle}</p>
                            <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                                {t.help.accompany.desc}
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="absolute bottom-[10%] right-[2%] lg:right-[5%] w-[280px] h-[180px] p-6 rounded-2xl bg-white/90 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 hover:border-[#202d35]/50 dark:hover:border-[#ccff00]/50 transition-all z-10 text-right shadow-xl">
                            <h3 className="text-xl font-bold mb-2 group-hover:text-[#202d35] dark:group-hover:text-[#ccff00] transition-colors">{t.help.update.title}</h3>
                            <p className="text-[10px] font-bold tracking-widest text-[#202d35] dark:text-[#ccff00] mb-3 uppercase">{t.help.update.subtitle}</p>
                            <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                                {t.help.update.desc}
                            </p>
                        </div>
                    </div>

                    {/* Mobile View */}
                    <div className="flex flex-col gap-8 md:hidden">
                        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10">
                            <Image src="/images/help.png" alt="Ayuda" fill className="object-cover" />
                        </div>
                        <div className="grid gap-4 text-center">
                            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-black/60 backdrop-blur-sm border border-black/5 dark:border-white/10">
                                <h3 className="text-xl font-bold mb-2 text-[#202d35] dark:text-[#ccff00]">{t.help.accompany.title}</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{t.help.accompany.desc}</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-black/60 backdrop-blur-sm border border-black/5 dark:border-white/10">
                                <h3 className="text-xl font-bold mb-2 text-[#202d35] dark:text-[#ccff00]">{t.help.update.title}</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{t.help.update.desc}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Steps / How it Works */}
            <section className="bg-gray-50 dark:bg-[#0a0a0a] py-24 transition-colors duration-300">
                <div className="container mx-auto px-6">
                    <div className="max-w-[1600px] mx-auto bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-8 md:p-12 border border-black/5 dark:border-white/5 relative overflow-hidden shadow-xl dark:shadow-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ccff00]/10 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-8 items-center relative z-10">
                            <div>
                                <div className="space-y-6">
                                    {t.steps.items.map((step, i) => (
                                        <Step key={i} number={i + 1} text={step} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 h-[400px] md:h-[350px]">
                                <div className="relative flex-[1.5] bg-white dark:bg-black rounded-3xl border border-black/5 dark:border-white/10 flex items-center justify-center p-2 overflow-hidden shadow-lg">
                                    <Image src="/images/noti.png" alt={t.steps.noti} fill className="object-contain p-4" />
                                </div>
                                <div className="relative flex-1 bg-white dark:bg-black rounded-3xl border border-black/5 dark:border-white/10 flex items-center justify-center p-2 overflow-hidden shadow-lg">
                                    <Image src="/images/app.png" alt={t.steps.app} fill className="object-contain p-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Investment Plans Section */}
            <section className="bg-white dark:bg-black py-24 relative overflow-hidden transition-colors duration-300">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mb-16">
                        <h3 className="text-2xl md:text-3xl font-bold text-[#202d35] dark:text-[#ccff00] mb-4 uppercase tracking-tighter">
                            {t.plans.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                            {t.plans.subtitle}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                        {t.plans.items.map((p, i) => (
                            <PricingCard key={i} title={p.title} desc={p.desc} />
                        ))}
                    </div>

                    <div className="flex justify-end mt-16">
                        <Image
                            src={isDark ? "/images/logo_verde.png" : "/images/LOGO-ligth.png"}
                            alt="FullTranki"
                            width={120}
                            height={40}
                            className="opacity-100 dark:opacity-80 hover:opacity-100 transition-opacity"
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-black/5 dark:border-white/10 bg-gray-50 dark:bg-[#050505] transition-colors duration-300">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-gray-400 dark:text-gray-500 text-sm">
                        {t.footer.rights}
                    </div>
                    <div className="flex gap-8">
                        <Link href="/privacy-policy" className="text-gray-400 dark:text-gray-500 hover:text-[#ccff00] transition-colors text-sm">
                            {t.footer.privacy}
                        </Link>
                        <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-[#ccff00] transition-colors text-sm">
                            {t.footer.terms}
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 hover:border-[#202d35]/50 dark:hover:border-[#ccff00]/50 transition-all hover:-translate-y-1 group shadow-lg dark:shadow-none">
            <div className="w-12 h-12 rounded-full bg-[#202d35]/10 dark:bg-[#ccff00]/10 flex items-center justify-center text-[#202d35] dark:text-[#ccff00] mb-6 group-hover:bg-[#202d35] dark:group-hover:bg-[#ccff00] group-hover:text-white dark:group-hover:text-black transition-all">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}

function PricingCard({ title, desc }) {
    return (
        <div className="bg-white dark:bg-white text-black p-8 rounded-[2rem] flex flex-col items-center text-center shadow-xl dark:shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:scale-105 transition-transform duration-300 border border-black/5 dark:border-transparent">
            <h3 className="text-3xl font-black mb-6 uppercase tracking-tight border-b-2 border-black/10 pb-2 w-full text-black">
                {title}
            </h3>
            <p className="text-sm font-bold leading-relaxed opacity-70 italic text-gray-800">
                {desc}
            </p>
        </div>
    );
}

function Step({ number, text }) {
    return (
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full border border-[#202d35] dark:border-[#ccff00] text-[#202d35] dark:text-[#ccff00] flex items-center justify-center text-sm font-bold shrink-0">
                {number}
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{text}</p>
        </div>
    );
}
