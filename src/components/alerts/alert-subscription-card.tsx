'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BellIcon,
  MailIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionData {
  id: number;
  email: string;
  enableBullish: boolean;
  enableBearish: boolean;
  minConfluence: number;
  maxAlertsPerDay: number;
  alertsSentToday?: number;
  isActive: boolean;
}

export function AlertSubscriptionCard() {
  const { user, isLoaded } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local state for form
  const [enableBullish, setEnableBullish] = useState(true);
  const [enableBearish, setEnableBearish] = useState(true);
  const [minConfluence, setMinConfluence] = useState<number>(4);

  // Fetch subscription status
  useEffect(() => {
    async function fetchSubscription() {
      if (!isLoaded || !user) return;

      try {
        const res = await fetch('/api/alerts/subscribe');
        const data = await res.json();

        if (data.subscription) {
          setSubscription(data.subscription);
          setEnableBullish(data.subscription.enableBullish);
          setEnableBearish(data.subscription.enableBearish);
          setMinConfluence(data.subscription.minConfluence);
        }
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
        setError('Failed to load subscription status');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubscription();
  }, [isLoaded, user]);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubscribe = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableBullish,
          enableBearish,
          minConfluence,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setSubscription(data.subscription);
      setSuccessMessage('Successfully subscribed to alerts!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setSubscription(null);
      setSuccessMessage('Successfully unsubscribed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePreferences = async () => {
    if (!subscription) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/alerts/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableBullish,
          enableBearish,
          minConfluence,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update preferences');
      }

      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              enableBullish: data.preferences.enableBullish,
              enableBearish: data.preferences.enableBearish,
              minConfluence: data.preferences.minConfluence,
            }
          : null
      );
      setSuccessMessage('Preferences updated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    subscription &&
    (enableBullish !== subscription.enableBullish ||
      enableBearish !== subscription.enableBearish ||
      minConfluence !== subscription.minConfluence);

  if (!isLoaded || isLoading) {
    return <AlertSubscriptionSkeleton />;
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-primary" />
            Confluence Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sign in to receive email alerts when coins reach high confluence.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isSubscribed = subscription?.isActive;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-primary" />
            Confluence Alerts
          </CardTitle>
          {isSubscribed && (
            <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
            <CheckCircleIcon className="h-4 w-4" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
            <AlertCircleIcon className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Email Display */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MailIcon className="h-4 w-4" />
          <span>Alerts will be sent to:</span>
          <span className="font-medium text-foreground">
            {user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress}
          </span>
        </div>

        {/* Alert Preferences */}
        <div className="space-y-4 pt-2">
          {/* Bullish Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Bullish Alerts</span>
            </div>
            <Switch
              checked={enableBullish}
              onCheckedChange={setEnableBullish}
              disabled={isSaving}
            />
          </div>

          {/* Bearish Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDownIcon className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Bearish Alerts</span>
            </div>
            <Switch
              checked={enableBearish}
              onCheckedChange={setEnableBearish}
              disabled={isSaving}
            />
          </div>

          {/* Minimum Confluence */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Minimum Confluence</span>
              <p className="text-xs text-muted-foreground">
                Only alert when this many factors align
              </p>
            </div>
            <Select
              value={String(minConfluence)}
              onValueChange={(v) => setMinConfluence(Number(v))}
              disabled={isSaving}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4/5</SelectItem>
                <SelectItem value="5">5/5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Usage Stats (if subscribed) */}
        {isSubscribed && subscription && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>
              Alerts today: {subscription.alertsSentToday || 0} / {subscription.maxAlertsPerDay}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {!isSubscribed ? (
            <Button
              onClick={handleSubscribe}
              disabled={isSaving || (!enableBullish && !enableBearish)}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Subscribing...
                </>
              ) : (
                <>
                  <BellIcon className="h-4 w-4 mr-2" />
                  Enable Alerts
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleUpdatePreferences}
                disabled={isSaving || !hasChanges || (!enableBullish && !enableBearish)}
                className={cn(
                  'flex-1',
                  hasChanges && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleUnsubscribe}
                disabled={isSaving}
              >
                Unsubscribe
              </Button>
            </>
          )}
        </div>

        {/* Validation Warning */}
        {!enableBullish && !enableBearish && (
          <p className="text-xs text-amber-500">
            At least one alert type must be enabled
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertSubscriptionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-64" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
