// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef MOJO_SERVICES_VIEW_MANAGER_NODE_H_
#define MOJO_SERVICES_VIEW_MANAGER_NODE_H_

#include <vector>

#include "base/logging.h"
#include "mojo/services/public/interfaces/view_manager/view_manager.mojom.h"
#include "mojo/services/view_manager/ids.h"
#include "mojo/services/view_manager/view_manager_export.h"
#include "third_party/skia/include/core/SkBitmap.h"
#include "ui/aura/window.h"
#include "ui/aura/window_delegate.h"
#include "ui/aura/window_observer.h"

namespace mojo {
namespace service {

class NodeDelegate;

// Represents a node in the graph. Delegate is informed of interesting events.
class MOJO_VIEW_MANAGER_EXPORT Node
    : public aura::WindowObserver,
      public aura::WindowDelegate {
 public:
  Node(NodeDelegate* delegate, const NodeId& id);
  virtual ~Node();

  static Node* NodeForWindow(aura::Window* window);

  const NodeId& id() const { return id_; }

  void Add(Node* child);
  void Remove(Node* child);

  void Reorder(Node* child, Node* relative, OrderDirection direction);

  aura::Window* window() { return &window_; }

  const gfx::Rect& bounds() const { return window_.bounds(); }

  const Node* GetParent() const;
  Node* GetParent() {
    return const_cast<Node*>(const_cast<const Node*>(this)->GetParent());
  }

  const Node* GetRoot() const;
  Node* GetRoot() {
    return const_cast<Node*>(const_cast<const Node*>(this)->GetRoot());
  }

  std::vector<const Node*> GetChildren() const;
  std::vector<Node*> GetChildren();

  bool Contains(const Node* node) const;

  // Returns true if the window is visible. This does not consider visibility
  // of any ancestors.
  bool IsVisible() const;
  void SetVisible(bool value);

  void SetBitmap(const SkBitmap& contents);
  const SkBitmap& bitmap() const { return bitmap_; }

 private:
  // WindowObserver overrides:
  virtual void OnWindowHierarchyChanged(
      const aura::WindowObserver::HierarchyChangeParams& params) OVERRIDE;

  // WindowDelegate overrides:
  virtual gfx::Size GetMinimumSize() const OVERRIDE;
  virtual gfx::Size GetMaximumSize() const OVERRIDE;
  virtual void OnBoundsChanged(const gfx::Rect& old_bounds,
                               const gfx::Rect& new_bounds) OVERRIDE;
  virtual gfx::NativeCursor GetCursor(const gfx::Point& point) OVERRIDE;
  virtual int GetNonClientComponent(const gfx::Point& point) const OVERRIDE;
  virtual bool ShouldDescendIntoChildForEventHandling(
      aura::Window* child,
      const gfx::Point& location) OVERRIDE;
  virtual bool CanFocus() OVERRIDE;
  virtual void OnCaptureLost() OVERRIDE;
  virtual void OnPaint(gfx::Canvas* canvas) OVERRIDE;
  virtual void OnDeviceScaleFactorChanged(float device_scale_factor) OVERRIDE;
  virtual void OnWindowDestroying(aura::Window* window) OVERRIDE;
  virtual void OnWindowDestroyed(aura::Window* window) OVERRIDE;
  virtual void OnWindowTargetVisibilityChanged(bool visible) OVERRIDE;
  virtual bool HasHitTestMask() const OVERRIDE;
  virtual void GetHitTestMask(gfx::Path* mask) const OVERRIDE;

  NodeDelegate* delegate_;
  const NodeId id_;

  aura::Window window_;
  SkBitmap bitmap_;

  DISALLOW_COPY_AND_ASSIGN(Node);
};

}  // namespace service
}  // namespace mojo

#endif  // MOJO_SERVICES_VIEW_MANAGER_NODE_H_
