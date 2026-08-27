'use client';

import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FacebookIcon, InstagramIcon, YoutubeIcon, Music2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

import { DEFAULT_FEATURES, type FeatureItem } from '@/types/site-settings';

interface FooterProps {
  socialFacebook?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  socialTiktok?: string;
  activeFeatures?: FeatureItem[];
}

export function Footer({
  socialFacebook,
  socialInstagram,
  socialYoutube,
  socialTiktok,
  activeFeatures,
}: FooterProps = {}) {
  const { t } = useLanguage();

  const platformItems = (activeFeatures && activeFeatures.length > 0 ? activeFeatures : DEFAULT_FEATURES)
    .filter(f => f.enabled)
    .map(f => ({ title: f.label, href: f.href }));

  const footerLinks = [
    {
      label: t.footer.sections.platform,
      links: platformItems,
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
        { title: 'Kebijakan Pengembalian', href: '/refund' },
      ],
    },
    {
      label: t.footer.sections.follow,
      links: [
        ...(socialFacebook  ? [{ title: 'Facebook',  href: socialFacebook,  icon: FacebookIcon  }] : []),
        ...(socialInstagram ? [{ title: 'Instagram', href: socialInstagram, icon: InstagramIcon }] : []),
        ...(socialYoutube   ? [{ title: 'YouTube',   href: socialYoutube,   icon: YoutubeIcon   }] : []),
        ...(socialTiktok    ? [{ title: 'TikTok',    href: socialTiktok,    icon: Music2        }] : []),
      ],
    },
  ];

  return (
    <footer className="relative w-full border-t px-6 py-12 lg:py-16">
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center">

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
