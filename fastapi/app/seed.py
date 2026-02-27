"""
Seed script to populate the database with sample data.
Run with: python -m app.seed
"""
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.comment import Comment
from app.models.label import Label, TaskLabel
from app.utils.security import get_password_hash


def seed_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(User).first():
            print("Database already seeded. Skipping...")
            return

        print("Seeding users...")
        # Create users
        admin = User(
            email="admin@taskforge.com",
            name="Admin User",
            role=UserRole.ADMIN,
            password_hash=get_password_hash("admin123"),
        )
        member1 = User(
            email="alice@taskforge.com",
            name="Alice Smith",
            role=UserRole.MEMBER,
            password_hash=get_password_hash("alice123"),
        )
        member2 = User(
            email="bob@taskforge.com",
            name="Bob Johnson",
            role=UserRole.MEMBER,
            password_hash=get_password_hash("bob123"),
        )
        viewer = User(
            email="viewer@taskforge.com",
            name="Viewer User",
            role=UserRole.VIEWER,
            password_hash=get_password_hash("viewer123"),
        )

        db.add_all([admin, member1, member2, viewer])
        db.commit()

        print("Seeding projects...")
        # Create projects
        project1 = Project(
            name="Website Redesign",
            description="Redesign the company website with modern UI/UX",
            status=ProjectStatus.ACTIVE,
            owner_id=admin.id,
        )
        project2 = Project(
            name="Mobile App",
            description="Develop a mobile app for iOS and Android",
            status=ProjectStatus.ACTIVE,
            owner_id=admin.id,
        )
        project3 = Project(
            name="Internal Tools",
            description="Build internal productivity tools",
            status=ProjectStatus.ACTIVE,
            owner_id=member1.id,
        )
        project4 = Project(
            name="Legacy Migration",
            description="Migrate legacy systems to new infrastructure",
            status=ProjectStatus.ARCHIVED,
            owner_id=admin.id,
        )

        db.add_all([project1, project2, project3, project4])
        db.commit()

        print("Seeding labels...")
        # Create labels
        bug_label = Label(name="Bug", color="#FF0000", project_id=project1.id)
        feature_label = Label(name="Feature", color="#00FF00", project_id=project1.id)
        urgent_label = Label(name="Urgent", color="#FF6600", project_id=project1.id)
        backend_label = Label(name="Backend", color="#0000FF", project_id=project2.id)
        frontend_label = Label(name="Frontend", color="#00FFFF", project_id=project2.id)

        db.add_all([bug_label, feature_label, urgent_label, backend_label, frontend_label])
        db.commit()

        print("Seeding tasks...")
        # Create tasks for project1
        task1 = Task(
            title="Design homepage mockup",
            description="Create mockups for the new homepage design",
            status=TaskStatus.DONE,
            priority=TaskPriority.HIGH,
            project_id=project1.id,
            assignee_id=member1.id,
        )
        task2 = Task(
            title="Implement responsive navigation",
            description="Build a mobile-friendly navigation menu",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.MEDIUM,
            project_id=project1.id,
            assignee_id=member2.id,
        )
        task3 = Task(
            title="Fix header alignment issue",
            description="Header is misaligned on mobile devices",
            status=TaskStatus.TODO,
            priority=TaskPriority.URGENT,
            project_id=project1.id,
            assignee_id=member2.id,
        )

        # Create tasks for project2
        task4 = Task(
            title="Setup project structure",
            description="Initialize React Native project with proper architecture",
            status=TaskStatus.DONE,
            priority=TaskPriority.HIGH,
            project_id=project2.id,
            assignee_id=admin.id,
        )
        task5 = Task(
            title="Implement authentication",
            description="Add user authentication with JWT",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.HIGH,
            project_id=project2.id,
            assignee_id=member1.id,
        )
        task6 = Task(
            title="Design app icon",
            description="Create app icon for iOS and Android",
            status=TaskStatus.TODO,
            priority=TaskPriority.LOW,
            project_id=project2.id,
            assignee_id=None,
        )

        # Create tasks for project3
        task7 = Task(
            title="Build reporting dashboard",
            description="Create dashboard for team metrics",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.MEDIUM,
            project_id=project3.id,
            assignee_id=member1.id,
        )

        db.add_all([task1, task2, task3, task4, task5, task6, task7])
        db.commit()

        print("Seeding task labels...")
        # Add labels to tasks
        db.execute(TaskLabel.insert().values(task_id=task3.id, label_id=bug_label.id))
        db.execute(TaskLabel.insert().values(task_id=task3.id, label_id=urgent_label.id))
        db.execute(TaskLabel.insert().values(task_id=task1.id, label_id=feature_label.id))
        db.execute(TaskLabel.insert().values(task_id=task5.id, label_id=backend_label.id))
        db.commit()

        print("Seeding comments...")
        # Create comments
        comment1 = Comment(
            content="Great work on the mockups! The design looks modern and clean.",
            task_id=task1.id,
            author_id=admin.id,
        )
        comment2 = Comment(
            content="I'm working on this now. Should be done by end of day.",
            task_id=task2.id,
            author_id=member2.id,
        )
        comment3 = Comment(
            content="This is blocking the mobile release. Please prioritize.",
            task_id=task3.id,
            author_id=admin.id,
        )
        comment4 = Comment(
            content="I've investigated the issue. It's related to CSS flexbox.",
            task_id=task3.id,
            author_id=member2.id,
        )
        comment5 = Comment(
            content="Authentication flow is working. Now adding refresh token logic.",
            task_id=task5.id,
            author_id=member1.id,
        )

        db.add_all([comment1, comment2, comment3, comment4, comment5])
        db.commit()

        print("Database seeded successfully!")
        print("\nSample credentials:")
        print("- admin@taskforge.com / admin123 (ADMIN)")
        print("- alice@taskforge.com / alice123 (MEMBER)")
        print("- bob@taskforge.com / bob123 (MEMBER)")
        print("- viewer@taskforge.com / viewer123 (VIEWER)")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
