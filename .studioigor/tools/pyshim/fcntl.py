"""Windows stand-in for the Unix-only `fcntl` module.

The studio scripts (refs.py) take a file lock with fcntl.flock; on Windows that
module does not exist. Put this folder on PYTHONPATH when running them:

    PYTHONPATH=.studioigor/tools/pyshim python <skill>/scripts/refs.py ...

Only flock is provided; the lock is released when the file is closed.
"""
import msvcrt

LOCK_SH = 1
LOCK_EX = 2
LOCK_NB = 4
LOCK_UN = 8


def flock(f, op):
    fd = f if isinstance(f, int) else f.fileno()
    if op & LOCK_UN:
        try:
            msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
        except OSError:
            pass
        return
    if op & LOCK_NB:
        msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
        return
    for _ in range(30):  # LK_LOCK itself retries for ~10 s, then raises
        try:
            msvcrt.locking(fd, msvcrt.LK_LOCK, 1)
            return
        except OSError:
            continue
    raise OSError("fcntl shim: could not take the lock")
