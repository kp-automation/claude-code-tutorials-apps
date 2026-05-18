import pytest
from app.repositories.task_repository import TaskRepository
from app.models.user import User, UserRole
from app.models.project import Project
from app.schemas.task import TaskCreate, TaskUpdate
from app.models.task import TaskStatus, TaskPriority
from app.utils.security import get_password_hash
from app.utils.exceptions import ForbiddenException, NotFoundException


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def repo(db):
    return TaskRepository(db)


@pytest.fixture
def other_user(db):
    user = User(
        email="other@example.com",
        name="Other User",
        role=UserRole.MEMBER,
        password_hash=get_password_hash("otherpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_project(db, test_user):
    project = Project(name="Test Project", owner_id=test_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def other_project(db, other_user):
    project = Project(name="Other Project", owner_id=other_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# get_all
# ---------------------------------------------------------------------------

def test_get_all_empty(repo, test_user):
    assert repo.get_all(test_user.id) == []


def test_get_all_returns_tasks_for_user(repo, test_user, test_project):
    repo.create(TaskCreate(title="Task A", project_id=test_project.id), test_user.id)
    repo.create(TaskCreate(title="Task B", project_id=test_project.id), test_user.id)

    tasks = repo.get_all(test_user.id)
    assert len(tasks) == 2
    titles = {t.title for t in tasks}
    assert titles == {"Task A", "Task B"}


def test_get_all_isolation(repo, test_user, other_user, other_project):
    """Tasks belonging to another user's project must not appear."""
    repo.create(TaskCreate(title="Private", project_id=other_project.id), other_user.id)

    assert repo.get_all(test_user.id) == []


def test_get_all_only_returns_own_tasks_when_both_have_tasks(
    repo, test_user, other_user, test_project, other_project
):
    repo.create(TaskCreate(title="Mine", project_id=test_project.id), test_user.id)
    repo.create(TaskCreate(title="Theirs", project_id=other_project.id), other_user.id)

    tasks = repo.get_all(test_user.id)
    assert len(tasks) == 1
    assert tasks[0].title == "Mine"


def test_get_all_no_status_filter_does_not_raise(repo, test_user, test_project):
    """Regression: omitting status_filter must not raise AttributeError (null-guard fix).

    Previously, `if status_filter != "":` evaluated True for None, causing
    `None.upper()` to raise AttributeError and crash the endpoint with HTTP 500.
    The fix is `if status_filter is not None:`.
    """
    repo.create(TaskCreate(title="Task A", project_id=test_project.id), test_user.id)

    # Must not raise — the pre-fix code crashed with AttributeError: 'NoneType' has no .upper()
    result = repo.get_all(test_user.id)
    assert isinstance(result, list)


def test_get_all_page1_returns_first_task(repo, test_user, test_project):
    """Regression: page 1 must start at offset 0, not offset per_page (off-by-one fix).

    Previously, `skip = page * per_page` with page=1 skipped the first per_page rows,
    so any team with fewer tasks than per_page always received an empty list.
    The fix is `skip = (page - 1) * per_page`.
    """
    task = repo.create(TaskCreate(title="First Task", project_id=test_project.id), test_user.id)

    results = repo.get_all(test_user.id, page=1, per_page=20)
    assert len(results) == 1
    assert results[0].id == task.id


def test_get_all_pagination_splits_correctly(repo, test_user, test_project):
    """Page 1 and page 2 together return all tasks with no duplicates or gaps."""
    for i in range(5):
        repo.create(TaskCreate(title=f"Task {i}", project_id=test_project.id), test_user.id)

    page1 = repo.get_all(test_user.id, page=1, per_page=3)
    page2 = repo.get_all(test_user.id, page=2, per_page=3)

    assert len(page1) == 3
    assert len(page2) == 2
    # No overlap between pages
    ids1 = {t.id for t in page1}
    ids2 = {t.id for t in page2}
    assert ids1.isdisjoint(ids2)


# ---------------------------------------------------------------------------
# get_by_id
# ---------------------------------------------------------------------------

def test_get_by_id_returns_task(repo, test_user, test_project):
    created = repo.create(TaskCreate(title="Find Me", project_id=test_project.id), test_user.id)

    result = repo.get_by_id(created.id, test_user.id)
    assert result is not None
    assert result.id == created.id
    assert result.title == "Find Me"


def test_get_by_id_returns_none_when_not_found(repo, test_user):
    assert repo.get_by_id(99999, test_user.id) is None


def test_get_by_id_isolation(repo, test_user, other_user, other_project):
    """A task owned by another user is invisible — returns None, not an error."""
    task = repo.create(TaskCreate(title="Secret", project_id=other_project.id), other_user.id)

    assert repo.get_by_id(task.id, test_user.id) is None


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------

def test_create_returns_task_with_id_and_timestamps(repo, test_user, test_project):
    task = repo.create(TaskCreate(title="New Task", project_id=test_project.id), test_user.id)

    assert task.id is not None
    assert task.created_at is not None
    assert task.updated_at is not None


def test_create_persists_all_fields(repo, test_user, test_project):
    data = TaskCreate(
        title="Full Task",
        description="Details here",
        status=TaskStatus.IN_PROGRESS,
        priority=TaskPriority.HIGH,
        project_id=test_project.id,
    )
    task = repo.create(data, test_user.id)

    assert task.title == "Full Task"
    assert task.description == "Details here"
    assert task.status == TaskStatus.IN_PROGRESS
    assert task.priority == TaskPriority.HIGH
    assert task.project_id == test_project.id


def test_create_applies_default_status_and_priority(repo, test_user, test_project):
    task = repo.create(TaskCreate(title="Defaults", project_id=test_project.id), test_user.id)

    assert task.status == TaskStatus.TODO
    assert task.priority == TaskPriority.MEDIUM


def test_create_with_assignee(repo, test_user, other_user, test_project):
    task = repo.create(
        TaskCreate(title="Assigned", project_id=test_project.id, assignee_id=other_user.id),
        test_user.id,
    )
    assert task.assignee_id == other_user.id


def test_create_raises_forbidden_for_nonexistent_project(repo, test_user):
    with pytest.raises(ForbiddenException):
        repo.create(TaskCreate(title="Ghost", project_id=99999), test_user.id)


def test_create_raises_forbidden_for_other_users_project(repo, test_user, other_project):
    """A user must not be able to create tasks in a project they don't own."""
    with pytest.raises(ForbiddenException):
        repo.create(TaskCreate(title="Hijack", project_id=other_project.id), test_user.id)


# ---------------------------------------------------------------------------
# update
# ---------------------------------------------------------------------------

def test_update_changes_title(repo, test_user, test_project):
    task = repo.create(TaskCreate(title="Before", project_id=test_project.id), test_user.id)

    updated = repo.update(task.id, TaskUpdate(title="After"), test_user.id)
    assert updated.title == "After"


def test_update_changes_status_and_priority(repo, test_user, test_project):
    task = repo.create(TaskCreate(title="Task", project_id=test_project.id), test_user.id)

    updated = repo.update(
        task.id, TaskUpdate(status=TaskStatus.DONE, priority=TaskPriority.URGENT), test_user.id
    )
    assert updated.status == TaskStatus.DONE
    assert updated.priority == TaskPriority.URGENT


def test_update_partial_does_not_clobber_other_fields(repo, test_user, test_project):
    task = repo.create(
        TaskCreate(
            title="Original",
            description="Keep this",
            priority=TaskPriority.HIGH,
            project_id=test_project.id,
        ),
        test_user.id,
    )

    updated = repo.update(task.id, TaskUpdate(title="Changed"), test_user.id)
    assert updated.title == "Changed"
    assert updated.description == "Keep this"
    assert updated.priority == TaskPriority.HIGH


def test_update_persists_to_db(repo, db, test_user, test_project):
    task = repo.create(TaskCreate(title="Persist", project_id=test_project.id), test_user.id)
    repo.update(task.id, TaskUpdate(title="Persisted"), test_user.id)

    # Re-fetch directly from DB to confirm the write landed
    db.expire_all()
    refetched = repo.get_by_id(task.id, test_user.id)
    assert refetched.title == "Persisted"


def test_update_raises_not_found_for_missing_task(repo, test_user):
    with pytest.raises(NotFoundException):
        repo.update(99999, TaskUpdate(title="Ghost"), test_user.id)


def test_update_raises_not_found_for_other_users_task(repo, test_user, other_user, other_project):
    """Updating another user's task must raise NotFoundException (not leak existence)."""
    task = repo.create(TaskCreate(title="Theirs", project_id=other_project.id), other_user.id)

    with pytest.raises(NotFoundException):
        repo.update(task.id, TaskUpdate(title="Hijack"), test_user.id)


# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------

def test_delete_removes_task_and_returns_true(repo, test_user, test_project):
    task = repo.create(TaskCreate(title="Delete Me", project_id=test_project.id), test_user.id)

    result = repo.delete(task.id, test_user.id)
    assert result is True
    assert repo.get_by_id(task.id, test_user.id) is None


def test_delete_returns_false_when_not_found(repo, test_user):
    assert repo.delete(99999, test_user.id) is False


def test_delete_isolation(repo, test_user, other_user, other_project):
    """Attempting to delete another user's task returns False and leaves it intact."""
    task = repo.create(TaskCreate(title="Theirs", project_id=other_project.id), other_user.id)

    result = repo.delete(task.id, test_user.id)
    assert result is False
    # Task still exists for its actual owner
    assert repo.get_by_id(task.id, other_user.id) is not None
