import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs/Subject';

import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { User } from './user.model';

import {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession
} from 'amazon-cognito-identity-js'
import { Session } from 'protractor';

const POOL_DATA ={
  UserPoolId:"us-east-2_QsWCtCNdb",
  ClientId:"6decl68i68uu734lok9nhm6k3q"
}

const UserPool=new CognitoUserPool(POOL_DATA);

@Injectable()
export class AuthService {
  authIsLoading = new BehaviorSubject<boolean>(false);
  authDidFail = new BehaviorSubject<boolean>(false);
  authStatusChanged = new Subject<boolean>();
  registeredUser:CognitoUser;
  constructor(private router: Router) {}
  signUp(username: string, email: string, password: string): void {
    this.authIsLoading.next(true);
    const user: User = {
      username: username,
      email: email,
      password: password
    };
    const attrList:CognitoUserAttribute[]=[];
    const emailAttribute = {
      Name: 'email',
      Value: user.email
    };
    attrList.push(new CognitoUserAttribute(emailAttribute));

    UserPool.signUp(user.username,user.password,attrList,null,(err,result)=>{
        if(err){
            this.authDidFail.next(true);
            this.authIsLoading.next(false);
            return;
        }
        
        this.authDidFail.next(false);
        this.authIsLoading.next(false);
        this.registeredUser=result.user;
    });
    return;
  }
  confirmUser(username: string, code: string) {
    this.authIsLoading.next(true);
    const userData = {
      Username: username,
      Pool:UserPool
    };
    const cognitUser=new CognitoUser(userData);
    cognitUser.confirmRegistration(code,true,(error,result)=>{
        if(error){
          this.authDidFail.next(true);
          this.authIsLoading.next(false);
          return;
        }
        this.authDidFail.next(false);
        this.authIsLoading.next(false);
        this.router.navigate(['/']);
    });
  }
  signIn(username: string, password: string): void {
    this.authIsLoading.next(true);
    const authData = {
      Username: username,
      Password: password
    };
    const authDetails= new AuthenticationDetails(authData);
    const userData= {
      Username:username,
      Pool: UserPool
    }
    const cognitoUser=new CognitoUser(userData);
    const that=this;
    cognitoUser.authenticateUser(authDetails,{
        onSuccess:function(result:CognitoUserSession){
            that.authStatusChanged.next(true);
            that.authDidFail.next(false);
            that.authIsLoading.next(false);
            console.log(result);
        },
        onFailure:function(error){
          that.authDidFail.next(true);
          that.authIsLoading.next(false);
          console.log(error);
        }

    });

    this.authStatusChanged.next(true);
    return;
  }

  getAuthenticatedUser() {
    return UserPool.getCurrentUser();
  }
  logout() {
    this.getAuthenticatedUser().signOut();
    this.authStatusChanged.next(false);
  }
  isAuthenticated(): Observable<boolean> {
    const user = this.getAuthenticatedUser();
    const obs = Observable.create((observer) => {
      if (!user) {
        observer.next(false);
      } else {
        
        user.getSession((error,session)=>{
            if(error){
              observer.next(false);      
            }else{
                if(session.isValid()){
                  observer.next(true);      
                }else{
                  observer.next(false);      
                }
            }
        });
      }
      observer.complete();
    });
    return obs;
  }
  initAuth() {
    this.isAuthenticated().subscribe(
      (auth) => this.authStatusChanged.next(auth)
    );
  }
}
