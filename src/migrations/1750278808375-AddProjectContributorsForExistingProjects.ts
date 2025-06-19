import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectContributorsForExistingProjects1750278808375
  implements MigrationInterface
{
  name = 'AddProjectContributorsForExistingProjects1750278808375';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all existing projects with their owners
    const projects = await queryRunner.query(`
      SELECT id, owner_id, "createdAt" 
      FROM projects 
      WHERE status = 'ACTIVE'
    `);

    console.log(`Found ${projects.length} existing projects to migrate`);

    // For each project, create a ProjectContributor record for the owner
    for (const project of projects) {
      // Check if a ProjectContributor record already exists for this owner
      const existingContributor = await queryRunner.query(
        `
        SELECT id FROM project_contributors 
        WHERE project_id = $1 AND user_id = $2
      `,
        [project.id, project.owner_id],
      );

      if (existingContributor.length === 0) {
        // Create ProjectContributor record with OWNER role
        await queryRunner.query(
          `
          INSERT INTO project_contributors (id, role, project_id, user_id, joined_at)
          VALUES (uuid_generate_v4(), 'OWNER', $1, $2, $3)
        `,
          [project.id, project.owner_id, project.createdAt],
        );

        console.log(
          `Created OWNER contributor for project ${project.id} (owner: ${project.owner_id})`,
        );
      } else {
        console.log(
          `Project ${project.id} already has a contributor record for owner ${project.owner_id}`,
        );
      }
    }

    console.log(
      'Migration completed: All existing projects now have OWNER contributors',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all ProjectContributor records that were created by this migration
    // We can identify them by the OWNER role and joined_at matching project creation date
    await queryRunner.query(`
      DELETE FROM project_contributors 
      WHERE role = 'OWNER' 
      AND joined_at IN (
        SELECT "createdAt" FROM projects WHERE status = 'ACTIVE'
      )
    `);

    console.log(
      'Rollback completed: Removed OWNER contributors for existing projects',
    );
  }
}
