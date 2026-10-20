package rollback

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type FileBackupEntry struct {
	OriginalPath string
	BackupPath   string
	Existed      bool
	Mode         os.FileMode
}

type TransactionSnapshot struct {
	SnapshotID string
	CreatedAt  time.Time
	Entries    []FileBackupEntry
}

type Manager struct {
	mu          sync.Mutex
	snapshotDir string
	snapshots   map[string]*TransactionSnapshot
}

func NewManager(snapshotDir string) *Manager {
	return &Manager{
		snapshotDir: snapshotDir,
		snapshots:   make(map[string]*TransactionSnapshot),
	}
}

func (m *Manager) BeginSnapshot(snapshotID string, targetPaths []string) (*TransactionSnapshot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	dir := filepath.Join(m.snapshotDir, snapshotID)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("create snapshot dir: %w", err)
	}

	snap := &TransactionSnapshot{
		SnapshotID: snapshotID,
		CreatedAt:  time.Now().UTC(),
		Entries:    make([]FileBackupEntry, 0, len(targetPaths)),
	}

	for idx, orig := range targetPaths {
		backupFile := filepath.Join(dir, fmt.Sprintf("entry_%d.bak", idx))
		info, err := os.Lstat(orig)
		if os.IsNotExist(err) {
			snap.Entries = append(snap.Entries, FileBackupEntry{
				OriginalPath: orig,
				BackupPath:   backupFile,
				Existed:      false,
			})
			continue
		}
		if err != nil {
			return nil, fmt.Errorf("stat original file %s: %w", orig, err)
		}
		data, err := os.ReadFile(orig)
		if err != nil {
			return nil, fmt.Errorf("read original file %s: %w", orig, err)
		}
		if err := os.WriteFile(backupFile, data, 0600); err != nil {
			return nil, fmt.Errorf("write backup file %s: %w", backupFile, err)
		}
		snap.Entries = append(snap.Entries, FileBackupEntry{
			OriginalPath: orig,
			BackupPath:   backupFile,
			Existed:      true,
			Mode:         info.Mode().Perm(),
		})
	}

	m.snapshots[snapshotID] = snap
	return snap, nil
}

func (m *Manager) Rollback(snapshotID string) error {
	m.mu.Lock()
	snap, ok := m.snapshots[snapshotID]
	m.mu.Unlock()
	if !ok {
		return fmt.Errorf("snapshot %s not found", snapshotID)
	}

	for i := len(snap.Entries) - 1; i >= 0; i-- {
		entry := snap.Entries[i]
		if !entry.Existed {
			_ = os.Remove(entry.OriginalPath)
			continue
		}
		data, err := os.ReadFile(entry.BackupPath)
		if err != nil {
			return fmt.Errorf("read backup for %s: %w", entry.OriginalPath, err)
		}
		if err := os.WriteFile(entry.OriginalPath, data, entry.Mode); err != nil {
			return fmt.Errorf("restore %s: %w", entry.OriginalPath, err)
		}
	}
	return nil
}
