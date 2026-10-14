CREATE UNIQUE INDEX `line_user_unique` ON `records` (`owner`,json_extract(`data`, '$.userId')) WHERE `kind`='lineContacts';--> statement-breakpoint
CREATE UNIQUE INDEX `line_contact_unique` ON `records` (`owner`,json_extract(`data`, '$.contactId')) WHERE `kind`='lineContacts' AND json_extract(`data`, '$.contactId')!='';
