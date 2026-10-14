CREATE UNIQUE INDEX `contact_unique` ON `records` (`owner`, json_extract(`data`, '$.email')) WHERE `kind`='contacts';
--> statement-breakpoint
CREATE UNIQUE INDEX `page_unique` ON `records` (`owner`, json_extract(`data`, '$.slug')) WHERE `kind`='pages';
