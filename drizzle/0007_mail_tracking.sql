CREATE TABLE `mail_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`job_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`type` text NOT NULL,
	`url` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mail_events_campaign` ON `mail_events` (`owner`,`campaign_id`,`type`);--> statement-breakpoint
CREATE INDEX `mail_events_contact` ON `mail_events` (`owner`,`contact_id`,`campaign_id`);--> statement-breakpoint
ALTER TABLE `jobs` ADD `html` text;