package preflight

import (
	"fmt"
	"os"
)

var CompetingPanelPaths = []struct {
	Name string
	Path string
}{
	{Name: "cPanel/WHM", Path: "/usr/local/cpanel"},
	{Name: "Plesk", Path: "/usr/local/psa"},
	{Name: "DirectAdmin", Path: "/usr/local/directadmin"},
	{Name: "CyberPanel", Path: "/usr/local/CyberCP"},
	{Name: "Webmin/Virtualmin", Path: "/etc/webmin"},
}

type Report struct {
	SafeToInstall       bool     `json:"safeToInstall"`
	DetectedConflicts   []string `json:"detectedConflicts"`
	CgroupV2Available   bool     `json:"cgroupV2Available"`
}

func CheckCompetingPanels(rootPrefix string) (*Report, error) {
	rep := &Report{
		SafeToInstall:     true,
		DetectedConflicts: []string{},
	}

	for _, panel := range CompetingPanelPaths {
		fullPath := rootPrefix + panel.Path
		if _, err := os.Stat(fullPath); err == nil {
			rep.SafeToInstall = false
			rep.DetectedConflicts = append(rep.DetectedConflicts, fmt.Sprintf("%s (%s)", panel.Name, panel.Path))
		}
	}

	if _, err := os.Stat(rootPrefix + "/sys/fs/cgroup/cgroup.controllers"); err == nil {
		rep.CgroupV2Available = true
	}

	return rep, nil
}
