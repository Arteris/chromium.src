// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_BROWSER_UI_PASSWORDS_MANAGE_PASSWORDS_UI_CONTROLLER_H_
#define CHROME_BROWSER_UI_PASSWORDS_MANAGE_PASSWORDS_UI_CONTROLLER_H_

#include "base/memory/scoped_vector.h"
#include "base/timer/elapsed_timer.h"
#include "components/autofill/core/common/password_form.h"
#include "components/password_manager/core/browser/password_store.h"
#include "components/password_manager/core/common/password_manager_ui.h"
#include "content/public/browser/web_contents_observer.h"
#include "content/public/browser/web_contents_user_data.h"

namespace content {
class WebContents;
}

namespace password_manager {
struct CredentialInfo;
class PasswordFormManager;
}

class ManagePasswordsIcon;

// Per-tab class to control the Omnibox password icon and bubble.
class ManagePasswordsUIController
    : public content::WebContentsObserver,
      public content::WebContentsUserData<ManagePasswordsUIController>,
      public password_manager::PasswordStore::Observer {
 public:
  ~ManagePasswordsUIController() override;

  // Called when the user submits a form containing login information, so we
  // can handle later requests to save or blacklist that login information.
  // This stores the provided object in form_manager_ and triggers the UI to
  // prompt the user about whether they would like to save the password.
  void OnPasswordSubmitted(
      scoped_ptr<password_manager::PasswordFormManager> form_manager);

  // Called when the site asks user to choose from credentials. This triggers
  // the UI to prompt the user. |credentials| shouldn't be empty.
  bool OnChooseCredentials(
      ScopedVector<autofill::PasswordForm> credentials,
      base::Callback<void(const password_manager::CredentialInfo&)> callback);

  // Called when the password will be saved automatically, but we still wish to
  // visually inform the user that the save has occured.
  void OnAutomaticPasswordSave(
      scoped_ptr<password_manager::PasswordFormManager> form_manager);

  // Called when a form is autofilled with login information, so we can manage
  // password credentials for the current site which are stored in
  // |password_form_map|. This stores a copy of |password_form_map| and shows
  // the manage password icon.
  void OnPasswordAutofilled(const autofill::PasswordFormMap& password_form_map);

  // Called when a form is _not_ autofilled due to user blacklisting. This
  // stores a copy of |password_form_map| so that we can offer the user the
  // ability to reenable the manager for this form.
  void OnBlacklistBlockedAutofill(
      const autofill::PasswordFormMap& password_form_map);

  // PasswordStore::Observer implementation.
  void OnLoginsChanged(
      const password_manager::PasswordStoreChangeList& changes) override;

  // Called from the model when the user chooses to save a password; passes the
  // action off to the FormManager. The controller MUST be in a pending state,
  // and WILL be in MANAGE_STATE after this method executes.
  virtual void SavePassword();

  // Called from the model when the user chooses a credential.
  // The controller MUST be in a pending credentials state.
  virtual void ChooseCredential(bool was_chosen,
                                const autofill::PasswordForm& form);

  // Called from the model when the user chooses to never save passwords; passes
  // the action off to the FormManager. The controller MUST be in a pending
  // state, and WILL be in BLACKLIST_STATE after this method executes.
  virtual void NeverSavePassword();

  // Called from the model when the user chooses to unblacklist the site. The
  // controller MUST be in BLACKLIST_STATE, and WILL be in MANAGE_STATE after
  // this method executes.
  virtual void UnblacklistSite();

  // Open a new tab, pointing to the password manager settings page.
  virtual void NavigateToPasswordManagerSettingsPage();

  virtual const autofill::PasswordForm& PendingPassword() const;

  // Set the state of the Omnibox icon, and possibly show the associated bubble
  // without user interaction.
  virtual void UpdateIconAndBubbleState(ManagePasswordsIcon* icon);

  // Called from the model when the bubble is displayed.
  void OnBubbleShown();

  password_manager::ui::State state() const { return state_; }

  ScopedVector<autofill::PasswordForm>& new_password_forms() {
    return new_password_forms_;
  }

  // True if a password is sitting around, waiting for a user to decide whether
  // or not to save it.
  bool PasswordPendingUserDecision() const;

  const autofill::ConstPasswordFormMap& best_matches() const {
    return password_form_map_;
  }

  const GURL& origin() const { return origin_; }

 protected:
  explicit ManagePasswordsUIController(
      content::WebContents* web_contents);

  // The pieces of saving and blacklisting passwords that interact with
  // FormManager, split off into internal functions for testing/mocking.
  virtual void SavePasswordInternal();
  virtual void NeverSavePasswordInternal();

  // Called when a passwordform is autofilled, when a new passwordform is
  // submitted, or when a navigation occurs to update the visibility of the
  // manage passwords icon and bubble.
  virtual void UpdateBubbleAndIconVisibility();

  // content::WebContentsObserver:
  void DidNavigateMainFrame(
      const content::LoadCommittedDetails& details,
      const content::FrameNavigateParams& params) override;
  void WasHidden() override;

  // We create copies of PasswordForm objects that come in with unclear lifetime
  // and store them in this vector as well as in |password_form_map_| to ensure
  // that we destroy them correctly. If |new_password_forms_| gets cleared then
  // |password_form_map_| is to be cleared too.
  ScopedVector<autofill::PasswordForm> new_password_forms_;

  // All previously stored credentials for a specific site.
  // Protected, not private, so we can mess with the value in
  // ManagePasswordsUIControllerMock.
  autofill::ConstPasswordFormMap password_form_map_;

  // The current state of the password manager. Protected so we can manipulate
  // the value in tests.
  password_manager::ui::State state_;

  // Used to measure the amount of time on a page; if it's less than some
  // reasonable limit, then don't close the bubble upon navigation. We create
  // (and destroy) the timer in DidNavigateMainFrame.
  scoped_ptr<base::ElapsedTimer> timer_;

 private:
  friend class content::WebContentsUserData<ManagePasswordsUIController>;

  // Shows the password bubble without user interaction. The controller MUST
  // be in PENDING_PASSWORD_AND_BUBBLE_STATE.
  void ShowBubbleWithoutUserInteraction();

  // content::WebContentsObserver:
  void WebContentsDestroyed() override;

  // Set by OnPasswordSubmitted() when the user submits a form containing login
  // information.  If the user responds to a subsequent "Do you want to save
  // this password?" prompt, we ask this object to save or blacklist the
  // associated login information in Chrome's password store.
  scoped_ptr<password_manager::PasswordFormManager> form_manager_;

  // A callback to be invoked when user selects a credential.
  base::Callback<void(const password_manager::CredentialInfo&)>
      credentials_callback_;

  // Contains true is the bubble's appeared during the last call to
  // UpdateBubbleAndIconVisibility().
  bool bubble_shown_;

  // The origin of the form we're currently dealing with; we'll use this to
  // determine which PasswordStore changes we should care about when updating
  // |password_form_map_|.
  GURL origin_;

  DISALLOW_COPY_AND_ASSIGN(ManagePasswordsUIController);
};

#endif  // CHROME_BROWSER_UI_PASSWORDS_MANAGE_PASSWORDS_UI_CONTROLLER_H_
