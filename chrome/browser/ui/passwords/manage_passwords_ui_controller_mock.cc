// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/browser/ui/passwords/manage_passwords_ui_controller_mock.h"

#include "content/public/browser/web_contents.h"
#include "testing/gtest/include/gtest/gtest.h"

ManagePasswordsUIControllerMock::ManagePasswordsUIControllerMock(
    content::WebContents* contents)
    : ManagePasswordsUIController(contents),
      navigated_to_settings_page_(false),
      saved_password_(false),
      never_saved_password_(false),
      choose_credential_(false) {
  contents->SetUserData(UserDataKey(), this);
}

ManagePasswordsUIControllerMock::
    ~ManagePasswordsUIControllerMock() {}

void ManagePasswordsUIControllerMock::
    NavigateToPasswordManagerSettingsPage() {
  navigated_to_settings_page_ = true;
}

const autofill::PasswordForm&
    ManagePasswordsUIControllerMock::PendingPassword() const {
  return pending_password_;
}

void ManagePasswordsUIControllerMock::SetPendingPassword(
    autofill::PasswordForm pending_password) {
  pending_password_ = pending_password;
}

void ManagePasswordsUIControllerMock::UpdateBubbleAndIconVisibility() {
  ManagePasswordsUIController::UpdateBubbleAndIconVisibility();
  OnBubbleShown();
}

bool ManagePasswordsUIControllerMock::IsInstalled() const {
  return web_contents()->GetUserData(UserDataKey()) == this;
}

void ManagePasswordsUIControllerMock::SavePasswordInternal() {
  saved_password_ = true;
}

void ManagePasswordsUIControllerMock::NeverSavePasswordInternal() {
  never_saved_password_ = true;
}

void ManagePasswordsUIControllerMock::ChooseCredential(
    bool was_chosen,
    const autofill::PasswordForm& form) {
  EXPECT_FALSE(choose_credential_);
  choose_credential_ = true;
}
