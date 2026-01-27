CREATE TABLE "birdeye_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"chain" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"decimals" integer,
	"logo_uri" text,
	"price" numeric(20, 8),
	"price_change_24h" numeric(10, 4),
	"volume_24h" numeric(20, 2),
	"liquidity" numeric(20, 2),
	"market_cap" bigint,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "opportunity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_address" text NOT NULL,
	"token_symbol" text,
	"chain" text DEFAULT 'solana' NOT NULL,
	"pair_address" text,
	"pair_created_at" timestamp with time zone,
	"liquidity" numeric(20, 2),
	"volume_5m" numeric(20, 2),
	"volume_1h" numeric(20, 2),
	"volume_acceleration" numeric(10, 4),
	"price_change_1h" numeric(10, 4),
	"whale_confirmed" boolean DEFAULT false,
	"composite_score" numeric(5, 2) NOT NULL,
	"raw_data" jsonb,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whale_metrics_birdeye" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain" text NOT NULL,
	"token_address" text NOT NULL,
	"buy_volume_24h" numeric(20, 2) DEFAULT '0',
	"sell_volume_24h" numeric(20, 2) DEFAULT '0',
	"buy_count_24h" integer DEFAULT 0,
	"sell_count_24h" integer DEFAULT 0,
	"net_flow_24h" numeric(20, 2) DEFAULT '0',
	"largest_trade_24h" numeric(20, 2),
	"whale_score" integer DEFAULT 50,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_birdeye_tokens_chain_address" ON "birdeye_tokens" USING btree ("chain","address");--> statement-breakpoint
CREATE INDEX "idx_birdeye_tokens_chain_volume" ON "birdeye_tokens" USING btree ("chain","volume_24h");--> statement-breakpoint
CREATE INDEX "idx_birdeye_tokens_chain_marketcap" ON "birdeye_tokens" USING btree ("chain","market_cap");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_opportunity_token_unique" ON "opportunity_events" USING btree ("token_address","chain");--> statement-breakpoint
CREATE INDEX "idx_opportunity_chain_detected" ON "opportunity_events" USING btree ("chain","detected_at");--> statement-breakpoint
CREATE INDEX "idx_opportunity_score" ON "opportunity_events" USING btree ("composite_score");--> statement-breakpoint
CREATE INDEX "idx_opportunity_expires" ON "opportunity_events" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_whale_metrics_chain_address" ON "whale_metrics_birdeye" USING btree ("chain","token_address");--> statement-breakpoint
CREATE INDEX "idx_whale_metrics_chain_updated" ON "whale_metrics_birdeye" USING btree ("chain","last_updated_at");