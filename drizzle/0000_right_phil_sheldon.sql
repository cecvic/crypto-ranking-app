CREATE TABLE "api_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"data" jsonb NOT NULL,
	"source" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "api_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "coin_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"coin_id" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"sentiment_score" numeric(5, 2),
	"technical_score" numeric(5, 2),
	"whale_score" numeric(5, 2),
	"ai_score" numeric(5, 2),
	"price_performance_score" numeric(5, 2),
	"current_price" numeric(20, 8),
	"market_cap" bigint,
	"price_change_24h" numeric(10, 4),
	"price_change_7d" numeric(10, 4),
	"coin_data" jsonb,
	"signals" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "known_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"label" text NOT NULL,
	"name" text,
	"chain" text DEFAULT 'ethereum' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "known_addresses_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "ranking_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_time" timestamp with time zone DEFAULT now() NOT NULL,
	"fear_greed_value" integer,
	"fear_greed_classification" text,
	"total_coins" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "token_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_address" text NOT NULL,
	"chain" text DEFAULT 'ethereum' NOT NULL,
	"symbol" text NOT NULL,
	"coingecko_id" text NOT NULL,
	"decimals" integer DEFAULT 18 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "token_mappings_contract_address_unique" UNIQUE("contract_address")
);
--> statement-breakpoint
CREATE TABLE "whale_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"block_timestamp" timestamp with time zone NOT NULL,
	"token_address" text NOT NULL,
	"token_symbol" text,
	"coingecko_id" text,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"value_raw" text NOT NULL,
	"value_token" numeric(30, 10),
	"value_usd" numeric(20, 2),
	"transfer_type" text NOT NULL,
	"from_label" text,
	"to_label" text,
	"chain" text DEFAULT 'ethereum' NOT NULL,
	"webhook_id" text,
	"raw_payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "coin_rankings" ADD CONSTRAINT "coin_rankings_snapshot_id_ranking_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."ranking_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_cache_key" ON "api_cache" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "idx_api_cache_expires" ON "api_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_coin_rankings_unique" ON "coin_rankings" USING btree ("snapshot_id","coin_id");--> statement-breakpoint
CREATE INDEX "idx_coin_rankings_coin" ON "coin_rankings" USING btree ("coin_id","snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_coin_rankings_snapshot" ON "coin_rankings" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_known_addresses_address" ON "known_addresses" USING btree ("address");--> statement-breakpoint
CREATE INDEX "idx_snapshots_time" ON "ranking_snapshots" USING btree ("snapshot_time");--> statement-breakpoint
CREATE INDEX "idx_token_mappings_address" ON "token_mappings" USING btree ("contract_address");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_whale_events_tx_unique" ON "whale_events" USING btree ("transaction_hash","token_address");--> statement-breakpoint
CREATE INDEX "idx_whale_events_coin_time" ON "whale_events" USING btree ("coingecko_id","block_timestamp");--> statement-breakpoint
CREATE INDEX "idx_whale_events_timestamp" ON "whale_events" USING btree ("block_timestamp");--> statement-breakpoint
CREATE INDEX "idx_whale_events_type" ON "whale_events" USING btree ("transfer_type","block_timestamp");