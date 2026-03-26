"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Shield, Heart, Clock, Activity, CheckCircle, Smartphone, Sun, Moon } from 'lucide-react';

export default function LandingPage() {
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
                    <div className="flex items-center gap-6">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-[#ccff00]/50 transition-all group"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <Sun className="w-5 h-5 text-gray-400 group-hover:text-[#ccff00] transition-colors" />
                            ) : (
                                <Moon className="w-5 h-5 text-gray-600 group-hover:text-black transition-colors" />
                            )}
                        </button>

                        <Link href="/privacy-policy" className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors hidden md:block">
                            Privacidad
                        </Link>
                        <Link
                            href="/login"
                            className="px-6 py-2.5 bg-[#ccff00] text-black font-bold rounded-full hover:bg-[#bbe600] transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(204,255,0,0.3)]"
                        >
                            Iniciar Sesión
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
                            ¿Y SI PUEDES <br />
                            GENERAR <span className="text-[#202d35] dark:text-[#ccff00]">TRANQUILIDAD</span> <br />
                            Y <span className="text-[#202d35] dark:text-[#ccff00]">SEGURIDAD</span> <br />
                            JUSTO CUANDO <br />
                            MÁS SE NECESITA?
                        </h1>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <Link
                                href="/login"
                                className="group px-8 py-4 bg-[#ccff00] text-black font-bold rounded-full hover:bg-[#bbe600] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(204,255,0,0.4)] hover:scale-105 active:scale-95"
                            >
                                Ingresar al Sistema
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
                                Aunque tengan la tecnología, en los momentos claves <span className="text-[#202d35] dark:text-[#ccff00]">no siempre saben o pueden usarla.</span>
                            </h2>
                            <div className="space-y-6 text-lg">
                                <h2 className="text-[#202d35] dark:text-white text-3xl md:text-5xl font-bold mb-8 leading-tight">
                                    <span className="text-[#202d35] dark:text-[#ccff00]">Ahí es cuando más necesitan apoyo... porque cada minuto cuenta.</span>
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
                            CONTAR CON UN <span className="text-[#202d35] dark:text-[#ccff00]">ECOSISTEMA</span> QUE ALERTE A TUS CONTACTOS ES CLAVE
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FeatureCard
                            icon={<Activity />}
                            title="ACTUAR RÁPIDO"
                            desc="Notifica de inmediato en situaciones críticas."
                        />
                        <FeatureCard
                            icon={<Smartphone />}
                            title="VARIOS MECANISMOS"
                            desc="Funciona cuando otros medios no están a la mano."
                        />
                        <FeatureCard
                            icon={<CheckCircle />}
                            title="SENCILLO"
                            desc="Ideal para personas vulnerables, fácil de usar bajo presión."
                        />
                        <FeatureCard
                            icon={<Heart />}
                            title="TRANQUILIDAD"
                            desc="Asegura apoyo y paz mental para ti y los tuyos."
                        />
                    </div>
                </div>
            </section>

            {/* Value Proposition */}
            <section className="bg-white dark:bg-[#0a0a0a] py-24 transition-colors duration-300">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter drop-shadow-xl text-black dark:text-white">
                            COMO TE VAMOS A <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-black dark:from-white dark:to-gray-500">AYUDAR</span>
                        </h2>
                    </div>

                    {/* Desktop/Tablet Layout: Unified Aspect Ratio Container */}
                    <div className="relative w-full max-w-[1600px] mx-auto aspect-[21/9] lg:aspect-[16/9] hidden md:block group">
                        {/* Background Image Container */}
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

                        {/* Card 1: Acompañarte - Precise Alignment */}
                        <div className="absolute top-[10%] left-[2%] lg:left-[5%] w-[280px] h-[180px] p-6 rounded-2xl bg-white/90 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 hover:border-[#202d35]/50 dark:hover:border-[#ccff00]/50 transition-all z-10 shadow-xl">
                            <h3 className="text-xl font-bold mb-2 group-hover:text-[#202d35] dark:group-hover:text-[#ccff00] transition-colors">ACOMPAÑARTE</h3>
                            <p className="text-[10px] font-bold tracking-widest text-[#202d35] dark:text-[#ccff00] mb-3 uppercase">En el momento preciso</p>
                            <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                                Al momento de necesitarlo, podrás generar la alerta con un solo toque.
                            </p>
                        </div>

                        {/* Card 2: Actualizarte - Precise Alignment */}
                        <div className="absolute bottom-[10%] right-[2%] lg:right-[5%] w-[280px] h-[180px] p-6 rounded-2xl bg-white/90 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 hover:border-[#202d35]/50 dark:hover:border-[#ccff00]/50 transition-all z-10 text-right shadow-xl">
                            <h3 className="text-xl font-bold mb-2 group-hover:text-[#202d35] dark:group-hover:text-[#ccff00] transition-colors">ACTUALIZARTE</h3>
                            <p className="text-[10px] font-bold tracking-widest text-[#202d35] dark:text-[#ccff00] mb-3 uppercase">En todo momento</p>
                            <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                                Monitorea temperatura y valida la atención de alarmas.
                            </p>
                        </div>
                    </div>

                    {/* Mobile View (Stacked) */}
                    <div className="flex flex-col gap-8 md:hidden">
                        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10">
                            <Image
                                src="/images/help.png"
                                alt="Ayuda"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="grid gap-4">
                            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-black/60 backdrop-blur-sm border border-black/5 dark:border-white/10 text-center">
                                <h3 className="text-xl font-bold mb-2 text-[#ccff00]">ACOMPAÑARTE</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">Al momento de necesitarlo, podrás generar la alerta con un solo toque.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-black/60 backdrop-blur-sm border border-black/5 dark:border-white/10 text-center">
                                <h3 className="text-xl font-bold mb-2 text-[#ccff00]">ACTUALIZARTE</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">Monitorea temperatura, movimientos y valida la atención de alarmas.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Steps / How it Works */}
            <section className="bg-gray-50 dark:bg-[#0a0a0a] py-24 transition-colors duration-300">
                <div className="container mx-auto px-6">
                    <div className="max-w-[1600px] mx-auto bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-8 md:p-12 border border-black/5 dark:border-white/5 relative overflow-hidden shadow-xl dark:shadow-none">
                        {/* Decorative Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ccff00]/10 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-8 items-center relative z-10">
                            <div>
                                <div className="space-y-6">
                                    <Step number="1" text="Descargas el App." />
                                    <Step number="2" text="Obtienes el brazalete." />
                                    <Step number="3" text="Ingresas la información básica." />
                                    <Step number="4" text="Escoges el plan que más te convenga." />
                                    <Step number="5" text="Empiezas a estar protegido." />
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 h-[400px] md:h-[350px]">
                                <div className="relative flex-[1.5] bg-white dark:bg-black rounded-3xl border border-black/5 dark:border-white/10 flex items-center justify-center p-2 overflow-hidden shadow-lg">
                                    <Image
                                        src="/images/noti.png"
                                        alt="Notificación de alerta"
                                        fill
                                        className="object-contain p-4"
                                    />
                                </div>
                                <div className="relative flex-1 bg-white dark:bg-black rounded-3xl border border-black/5 dark:border-white/10 flex items-center justify-center p-2 overflow-hidden shadow-lg">
                                    <Image
                                        src="/images/app.png"
                                        alt="App interface"
                                        fill
                                        className="object-contain p-4"
                                    />
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
                            DARTE LAS OPCIONES ADECUADAS
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                            Dependiendo de tus necesidades, brindarte los planes de inversión:
                        </p>
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                        <PricingCard
                            title="EASY"
                            desc="Incluye dispositivo + app. Envía alertas a un contacto de confianza."
                        />
                        <PricingCard
                            title="SOLID"
                            desc="Además de EASY, llamadas y si tu contacto no responde, nuestro call center con IA te ayuda y canaliza lo necesario."
                        />
                        <PricingCard
                            title="BOOST"
                            desc="Incluye SOLID + Asistencia medica remota y envío de personal de asistencia medica a tu domicilio según la urgencia presentada."
                        />
                        <PricingCard
                            title="ULTRA"
                            desc="Todo lo anterior + IA + ambulancia, acompañamiento psicológico y atención médica en casa y/o telefónica."
                        />
                    </div>

                    {/* Section Logo */}
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
                        © 2026 FullTranki. Todos los derechos reservados.
                    </div>
                    <div className="flex gap-8">
                        <Link href="/privacy-policy" className="text-gray-400 dark:text-gray-500 hover:text-[#ccff00] transition-colors text-sm">
                            Política de Privacidad
                        </Link>
                        <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-[#ccff00] transition-colors text-sm">
                            Términos de servicio
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
