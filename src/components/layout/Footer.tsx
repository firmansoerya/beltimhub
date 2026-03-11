'use client';

import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  const footerLinks = [
    {
      label: t.footer.sections.platform,
      links: [
        { title: t.footer.links.news, href: '/berita' },
        { title: t.footer.links.fjb, href: '/fjb' },
        { title: t.footer.links.event, href: '/event' },
        { title: t.footer.links.wisata, href: '/wisata' },
        { title: t.footer.links.umkm, href: '/umkm' },
        { title: t.footer.links.loker, href: '/loker' },
        { title: t.footer.links.info, href: '/info' },
      ],
    },
    {
      label: t.footer.sections.account,
      links: [
        { title: t.footer.links.signIn, href: '/sign-in' },
        { title: t.footer.links.signUp, href: '/sign-up' },
        { title: t.footer.links.dashboard, href: '/dashboard' },
      ],
    },
    {
      label: t.footer.sections.info,
      links: [
        { title: t.footer.links.about, href: '/tentang' },
        { title: t.footer.links.terms, href: '/syarat' },
        { title: t.footer.links.privacy, href: '/privasi' },
      ],
    },
    {
      label: t.footer.sections.follow,
      links: [
        { title: 'Facebook', href: '#', icon: FacebookIcon },
        { title: 'Instagram', href: '#', icon: InstagramIcon },
        { title: 'YouTube', href: '#', icon: YoutubeIcon },
      ],
    },
  ];

  return (
    <footer className="relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center rounded-t-3xl border-t bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 py-12 lg:py-16">
      <div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <AnimatedContainer className="space-y-3">
          <div>
            <span className="font-bold text-lg">
              Beltim<span className="text-primary">Hub</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs">
            {t.footer.tagline}
          </p>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} BeltimHub. {t.footer.copyright}
          </p>
        </AnimatedContainer>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
          {footerLinks.map((section, index) => (
            <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
              <div className="mb-10 md:mb-0">
                <h3 className="text-xs font-medium">{section.label}</h3>
                <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <a
                        href={link.href}
                        className="hover:text-foreground inline-flex items-center transition-all duration-300"
                      >
                        {'icon' in link && link.icon && <link.icon className="me-1.5 size-3.5" />}
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </div>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>['className'];
  children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
