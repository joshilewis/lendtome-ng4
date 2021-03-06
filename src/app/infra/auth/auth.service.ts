import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import * as firebase from "firebase/app";
import { AngularFireAuth } from "angularfire2/auth";
import {
  AngularFirestore,
  AngularFirestoreDocument
} from "angularfire2/firestore";
import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/switchMap";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { PersistenceService } from "angular-persistence/src/services/persistence.service";
import { LendtomeService } from "../../lendtome.service";
import { StorageType } from "angular-persistence";
import { Constants } from "../contstants";

interface User {
  uid: string;
  email: string;
  photoURL?: string;
  displayName?: string;
}

@Injectable()
export class AuthService {
  currentToken: string;
  currentUser: User;
  token: Observable<string>;
  user: Observable<User>;
  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router,
    private persistenceService: PersistenceService
  ) {
    //// Get auth data, then get firestore user document || null
    this.user = this.afAuth.authState.switchMap(user => {
      if (user) {
        return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
      } else {
        return Observable.of(null);
      }
    });
    this.token = this.afAuth.idToken;
    this.afAuth.idToken.subscribe(token => {
      this.currentToken = token;
    });
    this.user.subscribe(user => {
      if (user) {
        this.currentUser = user;
      }
    });
  }

  googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.oAuthLogin(provider);
  }

  facebookLogin() {
    const provider = new firebase.auth.FacebookAuthProvider();
    return this.oAuthLogin(provider);
  }

  private oAuthLogin(provider) {
    return this.afAuth.auth.signInWithPopup(provider).then(credential => {
      this.updateUserData(credential.user);
    });
  }
  private updateUserData(user) {
    // Sets user data to firestore on login
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    const data: User = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
    return userRef.set(data);
  }

  signOut() {
    this.persistenceService.remove(Constants.keys.libraryId, StorageType.LOCAL);
    this.afAuth.auth.signOut().then(() => {
      this.router.navigate(["/"]);
    });
  }
}
