import React from 'react';
import { ArrowLeft, UtensilsCrossed, Github, Linkedin, ExternalLink, Code2, HeartHandshake, GitFork } from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
  onExplore?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBack, onExplore }) => {
  return (
    <div id="about-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 pb-28">
      {/* Top Back Navigation */}
      <div className="mb-6">
        <button
          type="button"
          id="about-back-btn"
          onClick={onBack}
          title="Go back"
          aria-label="Go back"
          className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 hover:text-orange-600 dark:hover:text-orange-400 border border-stone-200 dark:border-stone-800 shadow-xs text-sm font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Main Card Container */}
      <article className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 p-6 sm:p-10 md:p-12 shadow-xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-semibold">
              <span>Platform Info</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900 dark:text-white tracking-tight mt-1">
              About ChefFork
            </h1>
          </div>
        </div>

        {/* Primary Description */}
        <div className="prose prose-stone dark:prose-invert max-w-none mb-10">
          <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
            ChefFork is a social cooking platform where home chefs can share recipes, discover recipes from others, and create their own variations by forking recipes.
          </p>
        </div>

        {/* Value Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800/80">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white mb-1">Share Recipes</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Publish your kitchen creations with step-by-step guidance and vibrant media.</p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800/80">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <GitFork className="w-4 h-4 rotate-180" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white mb-1">Fork & Iterate</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Branch any recipe with your dietary tweaks while honoring the original creator.</p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800/80">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white mb-1">Home Chef Community</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Connect with food lovers, exchange tips, and explore living recipe lineage trees.</p>
          </div>
        </div>

        {/* Developer & Links Section */}
        <div className="pt-8 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-4 h-4 text-orange-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Developer Information
            </h2>
          </div>

          <div className="bg-stone-50 dark:bg-stone-800/40 rounded-2xl p-5 sm:p-6 border border-stone-200/70 dark:border-stone-800">
            <div className="mb-6">
              <span className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">
                Developer:
              </span>
              <span id="about-developer-name" className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white">
                Rashmi M Chimmalagi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* GitHub Link */}
              <div>
                <span className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                  GitHub:
                </span>
                <a
                  id="about-github-link"
                  href="https://github.com/rashmichimmalagi/ChefFork.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700/80 hover:border-orange-500/60 dark:hover:border-orange-500/60 transition-all shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-stone-900 dark:bg-stone-800 text-white flex items-center justify-center shrink-0">
                      <Github className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                      github.com/rashmichimmalagi/ChefFork.git
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-orange-500 shrink-0 transition-colors" />
                </a>
              </div>

              {/* LinkedIn Link */}
              <div>
                <span className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                  LinkedIn:
                </span>
                <a
                  id="about-linkedin-link"
                  href="https://www.linkedin.com/in/rashmi-chimmalagi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700/80 hover:border-orange-500/60 dark:hover:border-orange-500/60 transition-all shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0A66C2] text-white flex items-center justify-center shrink-0">
                      <Linkedin className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 group-hover:text-[#0A66C2] dark:group-hover:text-sky-400 transition-colors truncate">
                      linkedin.com/in/rashmi-chimmalagi
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-[#0A66C2] shrink-0 transition-colors" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Explore CTA */}
        {onExplore && (
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              id="about-explore-btn"
              onClick={onExplore}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <span>Explore Recipes</span>
            </button>
          </div>
        )}
      </article>
    </div>
  );
};
