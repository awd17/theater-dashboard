CREATE TABLE `box_office_daily` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movie_id` integer NOT NULL,
	`source` text NOT NULL,
	`observation_date` text NOT NULL,
	`territory` text NOT NULL,
	`rank` integer,
	`gross_cents` integer,
	`theater_count` integer,
	`per_theater_average_cents` integer,
	`cumulative_gross_cents` integer,
	`days_in_release` integer,
	`source_url` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `box_office_daily_source_movie_date_territory_uidx` ON `box_office_daily` (`source`,`movie_id`,`observation_date`,`territory`);--> statement-breakpoint
CREATE INDEX `box_office_daily_observation_date_idx` ON `box_office_daily` (`observation_date`);--> statement-breakpoint
CREATE INDEX `box_office_daily_movie_id_idx` ON `box_office_daily` (`movie_id`);--> statement-breakpoint
CREATE TABLE `ingest_run` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`url_count` integer DEFAULT 0 NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`meta_json` text
);
--> statement-breakpoint
CREATE TABLE `market_period` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`period_kind` text NOT NULL,
	`period_label` text NOT NULL,
	`period_start` text,
	`period_end` text,
	`geography` text NOT NULL,
	`currency` text NOT NULL,
	`box_office_cents` integer,
	`tickets_sold` integer,
	`average_ticket_price_cents` integer,
	`is_partial` integer,
	`source_url` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_period_source_kind_label_geography_uidx` ON `market_period` (`source`,`period_kind`,`period_label`,`geography`);--> statement-breakpoint
CREATE TABLE `movie_external_ids` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movie_id` integer NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`source_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movie_external_ids_source_external_id_uidx` ON `movie_external_ids` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `movie_external_ids_movie_id_idx` ON `movie_external_ids` (`movie_id`);--> statement-breakpoint
CREATE TABLE `movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`canonical_title` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
