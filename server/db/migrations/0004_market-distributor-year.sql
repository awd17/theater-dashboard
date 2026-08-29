CREATE TABLE `market_distributor_year` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`period_label` text NOT NULL,
	`geography` text NOT NULL,
	`distributor` text NOT NULL,
	`box_office_cents` integer NOT NULL,
	`tickets_sold` integer,
	`title_count` integer NOT NULL,
	`is_partial` integer,
	`source_url` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_distributor_year_source_label_geo_distributor_uidx` ON `market_distributor_year` (`source`,`period_label`,`geography`,`distributor`);--> statement-breakpoint
CREATE INDEX `market_distributor_year_period_label_idx` ON `market_distributor_year` (`period_label`);