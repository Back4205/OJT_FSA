import React, { useState, useMemo } from "react";
import type { MemberNotificationResponse } from "../../services/memberService";
import styles from "./NotificationDropdown.module.css";

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
};

type TabFilter = "ALL" | "UNREAD" | "READ";
const DROPDOWN_LIMIT = 5;
const ASSIGNMENT_PATTERN = /^(.+?)(\s+assigned task\s+".+?"\s+to\s+)(.+?)(\s+in project\b.*)$/i;
const JOIN_REQUEST_PATTERN = /^(.+?)(\s+requested to join workspace\b.*)$/i;

interface NotificationDropdownProps {
  notifications: MemberNotificationResponse[];
  onMarkRead: (id: number, read: boolean) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onNavigateToTask?: (taskId: number) => void;
  onRefresh?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigateToTask,
  onRefresh,
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabFilter>("ALL");
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [viewAllTab, setViewAllTab] = useState<TabFilter>("ALL");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filterByTab = (list: MemberNotificationResponse[], t: TabFilter) => {
    if (t === "UNREAD") return list.filter((n) => !n.read);
    if (t === "READ") return list.filter((n) => n.read);
    return list;
  };

  const dropdownItems = filterByTab(notifications, tab).slice(0, DROPDOWN_LIMIT);
  const viewAllItems = filterByTab(notifications, viewAllTab);

  const handleItemClick = async (noti: MemberNotificationResponse) => {
    if (!noti.read) {
      await onMarkRead(noti.id, true);
      onRefresh?.();
    }
    if (noti.taskId && onNavigateToTask) {
      onNavigateToTask(noti.taskId);
      setOpen(false);
      setViewAllOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    await onMarkAllRead();
    onRefresh?.();
  };

  const renderNotificationContent = (content: string) => {
    const match = content.match(ASSIGNMENT_PATTERN);
    if (!match) {
      const joinMatch = content.match(JOIN_REQUEST_PATTERN);
      if (!joinMatch) {
        return content;
      }

      return (
        <>
          <span className={styles.notificationName}>{joinMatch[1]}</span>
          {joinMatch[2]}
        </>
      );
    }

    const assigner = match[1];
    const middle = match[2];
    const recipient = match[3];
    const suffix = match[4];

    return (
      <>
        <span className={styles.notificationName}>{assigner}</span>
        {middle}
        <span className={styles.recipientHighlight}>{recipient}</span>
        {suffix}
      </>
    );
  };

  const renderTabs = (
    currentTab: TabFilter,
    setCurrentTab: (t: TabFilter) => void,
    className?: string
  ) => (
    <div className={className || styles.tabs}>
      {(["ALL", "UNREAD", "READ"] as TabFilter[]).map((t) => (
        <button
          key={t}
          className={`${styles.tab} ${currentTab === t ? styles.tabActive : ""}`}
          onClick={() => setCurrentTab(t)}
        >
          {t === "ALL" ? "All" : t === "UNREAD" ? "Unread" : "Read"}
        </button>
      ))}
    </div>
  );

  const renderItem = (noti: MemberNotificationResponse) => (
    <div
      key={noti.id}
      className={`${styles.item} ${!noti.read ? styles.itemUnread : ""}`}
      onClick={() => void handleItemClick(noti)}
    >
      <div className={`${styles.itemDot} ${noti.read ? styles.itemDotRead : ""}`} />
      <div className={styles.itemBody}>
        <div className={styles.itemContent}>{renderNotificationContent(noti.content)}</div>
        <div className={styles.itemMeta}>
          {(noti.workspaceName || noti.projectName) && (
            <span className={styles.itemHierarchy}>
              {noti.workspaceName && (
                <span className={styles.itemWorkspace}>
                  {noti.workspaceName}
                </span>
              )}
              {noti.workspaceName && noti.projectName && (
                <i className="bi bi-chevron-right" style={{ margin: "0 2px", fontSize: "0.7rem", color: "#94a3b8" }} />
              )}
              {noti.projectName && (
                <span className={styles.itemProject}>
                  <i className="bi bi-folder2" style={{ marginRight: 4 }} />
                  {noti.projectName}
                </span>
              )}
            </span>
          )}
          <span className={styles.itemTime}>{timeAgo(noti.timestamp)}</span>
        </div>
      </div>
    </div>
  );

  const renderEmpty = () => (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <i className="bi bi-bell-slash" />
      </div>
      No notifications
    </div>
  );

  return (
    <div className={styles.bellWrapper}>
      {/* Bell button */}
      <button
        className={styles.bellBtn}
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        title="Notifications"
      >
        <i className="bi bi-bell" />
        {unreadCount > 0 && (
          <span className={styles.bellBadge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.dropdown}>
            {/* Header */}
            <div className={styles.header}>
              <span className={styles.headerTitle}>Notifications</span>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={() => void handleMarkAllRead()}>
                  Mark all as read
                </button>
              )}
            </div>

            {/* Tabs */}
            {renderTabs(tab, setTab)}

            {/* List */}
            <div className={styles.list}>
              {dropdownItems.length > 0
                ? dropdownItems.map(renderItem)
                : renderEmpty()}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className={styles.footer}>
                <button
                  className={styles.viewAllBtn}
                  onClick={() => {
                    setViewAllOpen(true);
                    setViewAllTab(tab);
                    setOpen(false);
                  }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* View All Modal */}
      {viewAllOpen && (
        <div className={styles.modalOverlay} onClick={() => setViewAllOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>All notifications</span>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setViewAllOpen(false)}
              >
                &times;
              </button>
            </div>

            {/* Tabs */}
            {renderTabs(viewAllTab, setViewAllTab, styles.modalTabs)}

            {/* List */}
            <div className={styles.modalList}>
              {viewAllItems.length > 0
                ? viewAllItems.map(renderItem)
                : renderEmpty()}
            </div>

            {/* Footer */}
            {unreadCount > 0 && (
              <div className={styles.modalFooter}>
                <button className={styles.markAllBtn} onClick={() => void handleMarkAllRead()}>
                  <i className="bi bi-check2-all" style={{ marginRight: 6 }} />
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
