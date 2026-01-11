CREATE TABLE "alert_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"coin_id" text NOT NULL,
	"direction" text NOT NULL,
	"confluence_level" integer NOT NULL,
	"overall_score" numeric(5, 2),
	"sent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alert_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"enable_bullish" boolean DEFAULT true NOT NULL,
	"enable_bearish" boolean DEFAULT true NOT NULL,
	"min_confluence" integer DEFAULT 4 NOT NULL,
	"max_alerts_per_day" integer DEFAULT 20 NOT NULL,
	"alerts_sent_today" integer DEFAULT 0 NOT NULL,
	"last_alert_reset_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_subscription_id_alert_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."alert_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alert_history_sub_coin" ON "alert_history" USING btree ("subscription_id","coin_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_alert_history_sent" ON "alert_history" USING btree ("sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_alert_subs_user" ON "alert_subscriptions" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "idx_alert_subs_active" ON "alert_subscriptions" USING btree ("is_active");