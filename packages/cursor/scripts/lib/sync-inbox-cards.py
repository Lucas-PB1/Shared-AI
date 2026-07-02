#!/usr/bin/env python3
"""Seletor sync-inbox em cards (GTK3) — leitura confortável de resumos longos."""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import gi

    gi.require_version("Gtk", "3.0")
    from gi.repository import Gdk, Gtk, Pango
except ImportError:
    sys.exit(2)


CARD_MIN_WIDTH = 520
CARD_PADDING = 14
WINDOW_WIDTH = 640
WINDOW_HEIGHT = 560


def load_items(inbox: Path) -> list[dict]:
    if not inbox.is_file():
        return []
    data = json.loads(inbox.read_text(encoding="utf-8"))
    return data.get("items") or []


class ProjectCard(Gtk.EventBox):
    def __init__(self, item: dict, on_select) -> None:
        super().__init__()
        self.item = item
        self.on_select = on_select
        self.path = item["path"]

        self.get_style_context().add_class("sync-inbox-card")
        self.set_can_focus(True)

        frame = Gtk.Frame()
        frame.set_shadow_type(Gtk.ShadowType.OUT)
        self.add(frame)

        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        box.set_margin_start(CARD_PADDING)
        box.set_margin_end(CARD_PADDING)
        box.set_margin_top(CARD_PADDING)
        box.set_margin_bottom(CARD_PADDING)
        frame.add(box)

        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        box.pack_start(header, False, False, 0)

        name = Gtk.Label()
        name.set_markup(f"<b><span size='large'>{_escape(item['name'])}</span></b>")
        name.set_halign(Gtk.Align.START)
        name.set_xalign(0)
        header.pack_start(name, True, True, 0)

        branch = item.get("branch") or ""
        count = item.get("changedCount", 0)
        meta = Gtk.Label(label=f"{branch} · {count} arquivo{'s' if count != 1 else ''}")
        meta.set_halign(Gtk.Align.END)
        meta.get_style_context().add_class("dim-label")
        header.pack_start(meta, False, False, 0)

        summary = item.get("summary") or item.get("objective", "")
        summary_label = Gtk.Label(label=summary)
        summary_label.set_line_wrap(True)
        summary_label.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR)
        summary_label.set_max_width_chars(72)
        summary_label.set_halign(Gtk.Align.START)
        summary_label.set_xalign(0)
        summary_label.set_selectable(True)
        box.pack_start(summary_label, False, False, 0)

        detail = item.get("detail") or ""
        if detail:
            detail_label = Gtk.Label(label=detail)
            detail_label.set_line_wrap(True)
            detail_label.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR)
            detail_label.set_max_width_chars(72)
            detail_label.set_halign(Gtk.Align.START)
            detail_label.set_xalign(0)
            detail_label.get_style_context().add_class("dim-label")
            box.pack_start(detail_label, False, False, 0)

        self.connect("button-press-event", self._clicked)
        self.connect("key-press-event", self._key)

    def _clicked(self, _widget, _event) -> None:
        self.on_select(self)

    def _key(self, _widget, event) -> bool:
        if event.keyval in (Gdk.KEY_Return, Gdk.KEY_space):
            self.on_select(self)
            return True
        return False

    def set_selected(self, selected: bool) -> None:
        ctx = self.get_style_context()
        if selected:
            ctx.add_class("sync-inbox-card-selected")
        else:
            ctx.remove_class("sync-inbox-card-selected")


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


class SyncInboxWindow(Gtk.Window):
    def __init__(self, items: list[dict]) -> None:
        super().__init__(title="HostDime — O que retomar?")
        self.set_default_size(WINDOW_WIDTH, WINDOW_HEIGHT)
        self.set_border_width(12)
        self.selected_path: str | None = None
        self.cards: list[ProjectCard] = []

        css = Gtk.CssProvider()
        css.load_from_data(
            b"""
            .sync-inbox-card { margin-bottom: 10px; }
            .sync-inbox-card-selected frame {
                border: 2px solid #3584e4;
                border-radius: 6px;
            }
            .dim-label { opacity: 0.72; }
            """
        )
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(),
            css,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
        )

        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        self.add(outer)

        subtitle = Gtk.Label(
            label=f"{len(items)} projeto(s) com alterações locais — clique no card e abra no Cursor"
        )
        subtitle.set_line_wrap(True)
        subtitle.set_halign(Gtk.Align.START)
        subtitle.set_xalign(0)
        outer.pack_start(subtitle, False, False, 0)

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroll.set_min_content_width(CARD_MIN_WIDTH)
        outer.pack_start(scroll, True, True, 0)

        list_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        scroll.add(list_box)

        for item in items:
            card = ProjectCard(item, self._select_card)
            list_box.pack_start(card, False, False, 0)
            self.cards.append(card)

        if self.cards:
            self._select_card(self.cards[0])

        actions = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        actions.set_halign(Gtk.Align.END)
        outer.pack_start(actions, False, False, 0)

        skip_btn = Gtk.Button(label="Pular")
        skip_btn.connect("clicked", lambda *_: self._close(None))
        actions.pack_start(skip_btn, False, False, 0)

        open_btn = Gtk.Button(label="Abrir no Cursor")
        open_btn.get_style_context().add_class("suggested-action")
        open_btn.connect("clicked", self._open)
        actions.pack_start(open_btn, False, False, 0)

        self.connect("delete-event", self._close)
        self.connect("key-press-event", self._window_key)

    def _select_card(self, card: ProjectCard) -> None:
        for c in self.cards:
            c.set_selected(c is card)
        self.selected_path = card.path

    def _open(self, _widget) -> None:
        if self.selected_path:
            print(self.selected_path, flush=True)
        Gtk.main_quit()

    def _close(self, _widget) -> bool:
        Gtk.main_quit()
        return False

    def _window_key(self, _widget, event) -> bool:
        if event.keyval == Gdk.KEY_Escape:
            Gtk.main_quit()
            return True
        return False


def main() -> int:
    inbox = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / ".cursor/hostdime-ia/sync-inbox.json"
    items = load_items(inbox)
    if not items:
        return 0

    win = SyncInboxWindow(items)
    win.connect("destroy", Gtk.main_quit)
    win.show_all()
    Gtk.main()
    return 0


if __name__ == "__main__":
    sys.exit(main())
