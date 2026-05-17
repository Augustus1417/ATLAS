import {
  formatPrice,
  getComponentLink,
  getComponentStore,
  openComponentLink,
} from '../utils/format';
import { Button, Card, Badge } from './UI';

export function RecommendedPartCard({
  component,
  index,
  onRegenerate,
  regenerating = false,
}) {
  const hasLink = Boolean(getComponentLink(component));
  const store = getComponentStore(component);

  return (
    <Card
      className={`transition-all duration-300 group ${
        hasLink ? 'cursor-pointer hover:border-violet-400/40 hover:bg-white/[0.07]' : ''
      }`}
      onClick={() => {
        if (hasLink) openComponentLink(component);
      }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="default" size="sm">
              {component.category}
            </Badge>
            <h4 className="text-lg font-bold text-white mt-2 group-hover:text-purple-300 transition-colors leading-snug">
              {component.name}
            </h4>
          </div>
          {onRegenerate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={regenerating}
              className="shrink-0 !min-h-0 py-1.5 px-2.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate(component.category, index);
              }}
            >
              Regenerate
            </Button>
          )}
        </div>

        <p className="text-white/60 text-sm">{component.brand}</p>

        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm font-medium">Price:</span>
            <span className="text-white font-semibold">{formatPrice(component)}</span>
          </div>
          {hasLink ? (
            <p className="text-violet-300 text-sm font-medium">
              Click to view on {store || 'retailer'} →
            </p>
          ) : (
            <p className="text-white/40 text-xs">No listing link available</p>
          )}
        </div>

        {component.reason && (
          <div className="p-3 rounded-lg bg-blue-500/15 border border-blue-500/30">
            <p className="text-blue-200 text-sm leading-relaxed">💡 {component.reason}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
