import React from 'react';
import { GitFork, ArrowDown, Sparkles, ChefHat } from 'lucide-react';
import { RecipeDetailData } from '../types';

interface LineageGraphProps {
  recipe: RecipeDetailData;
  onSelectRecipe: (id: string) => void;
}

export const LineageGraph: React.FC<LineageGraphProps> = ({ recipe, onSelectRecipe }) => {
  const ancestors = recipe.ancestors || [];
  const forks = recipe.directForks || [];
  const isOriginal = !recipe.parent_recipe_id && ancestors.length === 0;

  return (
    <div id="lineage-graph" className="p-5 rounded-2xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800">
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Recipe Branch & Forks Tree
        </span>
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {forks.length} {forks.length === 1 ? 'direct fork' : 'direct forks'}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Ancestors */}
        {ancestors.length > 0 ? (
          ancestors.map((ancestor, index) => (
            <React.Fragment key={ancestor.id}>
              <button
                type="button"
                onClick={() => onSelectRecipe(ancestor.id)}
                className="w-full max-w-md p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-orange-500 dark:hover:border-orange-500 text-left transition-all shadow-xs group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {index === 0 ? 'Original Recipe' : `Predecessor #${index}`}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      by {ancestor.authorName || 'Chef'}
                    </span>
                  </div>
                  <GitFork className="w-3.5 h-3.5 text-stone-400 group-hover:text-orange-500 transition-colors" />
                </div>
                <h4 className="mt-1 font-semibold text-sm text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                  {ancestor.title}
                </h4>
              </button>
              <ArrowDown className="w-4 h-4 text-stone-400" />
            </React.Fragment>
          ))
        ) : isOriginal ? (
          <div className="w-full max-w-md p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>This is an original culinary creation (Root Recipe)</span>
          </div>
        ) : null}

        {/* Current Recipe Node */}
        <div className="w-full max-w-md p-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md">
          <div className="flex items-center justify-between text-xs text-orange-100 mb-1">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5" /> Current Recipe
            </span>
            <span>by {recipe.author?.name || 'Chef'}</span>
          </div>
          <h3 className="font-bold text-base text-white line-clamp-1">{recipe.title}</h3>
          {recipe.description && (
            <p className="text-xs text-orange-50 line-clamp-2 mt-1 opacity-90">{recipe.description}</p>
          )}
        </div>

        {/* Downstream Forks */}
        {forks.length > 0 && (
          <>
            <ArrowDown className="w-4 h-4 text-stone-400" />
            <div className="w-full max-w-md space-y-2">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-center">
                Downstream Variations & Forks
              </p>
              <div className="grid grid-cols-1 gap-2">
                {forks.map((fork) => (
                  <button
                    key={fork.id}
                    type="button"
                    onClick={() => onSelectRecipe(fork.id)}
                    className="w-full p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-orange-500 dark:hover:border-orange-500 text-left transition-all shadow-xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                        Forked by {fork.author?.name || 'Chef'}
                      </span>
                      <GitFork className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <h4 className="mt-1 font-semibold text-sm text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                      {fork.title}
                    </h4>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
