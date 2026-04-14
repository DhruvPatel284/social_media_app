import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOrderStatus1770708424458 implements MigrationInterface {
    name = 'FixOrderStatus1770708424458'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`comment\` (\`id\` int NOT NULL AUTO_INCREMENT, \`comment\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NULL, \`postId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`post\` (\`id\` int NOT NULL AUTO_INCREMENT, \`content\` varchar(255) NOT NULL, \`Reviewed\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`phoneNumber\` varchar(255) NULL, \`firebaseUid\` varchar(255) NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NULL, \`role\` varchar(255) NOT NULL DEFAULT 'user', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`oauth_access_tokens\` (\`id\` varchar(36) NOT NULL, \`tokenId\` varchar(255) NOT NULL, \`expiresAt\` datetime NOT NULL, \`revokedAt\` datetime NULL, \`revoked\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, \`userId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_likes_post\` (\`user_id\` varchar(36) NOT NULL, \`post_id\` int NOT NULL, INDEX \`IDX_cfbca22fc0a5b03d8b17782399\` (\`user_id\`), INDEX \`IDX_67c7824f8c57a1dc9c1f19cfe2\` (\`post_id\`), PRIMARY KEY (\`user_id\`, \`post_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`comment\` ADD CONSTRAINT \`FK_c0354a9a009d3bb45a08655ce3b\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comment\` ADD CONSTRAINT \`FK_94a85bb16d24033a2afdd5df060\` FOREIGN KEY (\`postId\`) REFERENCES \`post\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`post\` ADD CONSTRAINT \`FK_5c1cf55c308037b5aca1038a131\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`oauth_access_tokens\` ADD CONSTRAINT \`FK_7234a36d8e49a1fa85095328845\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_likes_post\` ADD CONSTRAINT \`FK_cfbca22fc0a5b03d8b177823994\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`user_likes_post\` ADD CONSTRAINT \`FK_67c7824f8c57a1dc9c1f19cfe2b\` FOREIGN KEY (\`post_id\`) REFERENCES \`post\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_likes_post\` DROP FOREIGN KEY \`FK_67c7824f8c57a1dc9c1f19cfe2b\``);
        await queryRunner.query(`ALTER TABLE \`user_likes_post\` DROP FOREIGN KEY \`FK_cfbca22fc0a5b03d8b177823994\``);
        await queryRunner.query(`ALTER TABLE \`oauth_access_tokens\` DROP FOREIGN KEY \`FK_7234a36d8e49a1fa85095328845\``);
        await queryRunner.query(`ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_5c1cf55c308037b5aca1038a131\``);
        await queryRunner.query(`ALTER TABLE \`comment\` DROP FOREIGN KEY \`FK_94a85bb16d24033a2afdd5df060\``);
        await queryRunner.query(`ALTER TABLE \`comment\` DROP FOREIGN KEY \`FK_c0354a9a009d3bb45a08655ce3b\``);
        await queryRunner.query(`DROP INDEX \`IDX_67c7824f8c57a1dc9c1f19cfe2\` ON \`user_likes_post\``);
        await queryRunner.query(`DROP INDEX \`IDX_cfbca22fc0a5b03d8b17782399\` ON \`user_likes_post\``);
        await queryRunner.query(`DROP TABLE \`user_likes_post\``);
        await queryRunner.query(`DROP TABLE \`oauth_access_tokens\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP TABLE \`post\``);
        await queryRunner.query(`DROP TABLE \`comment\``);
    }

}
