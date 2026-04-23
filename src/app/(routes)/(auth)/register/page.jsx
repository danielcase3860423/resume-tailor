'use client';
import React, { useState } from 'react';

import { COOKIE_USER_KEY, ERROR_SUCCESS, GOOGLE_LOGIN_CLIENT_KEY, loginBanner } from '@/config/constants';
import Link from 'next/link';
import { Input } from 'antd';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode, validUSPhone } from '@/helpers/common';
import userService from '@/services/(routes)/users';
import { showToastErrorMsg, showToastInfoMsg, validEmail } from '@/helpers/frontend';
import { setCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { useGlobalContext } from '@/context/auth';
import {
  MSG_PROMPT_EMAIL_ADDRESS,
  MSG_PROMPT_EMAIL_PASSWORD,
  MSG_PROMPT_FIRST_NAME,
  MSG_PROMPT_LAST_NAME,
  MSG_PROMPT_LOGIN_COMPLETED,
  MSG_PROMPT_USER_PHONE,
  MSG_PROMPT_VALID_EMAIL_ADDRESS,
  MSG_PROMPT_VALID_US_PHONE_NUMBER
} from '@/config/messages';
import PhoneInput from '@/_components/layout/common/PhoneInput';
import {
  ContentWrapper,
  AuthLayout,
  ImgWrapper,
  AuthBrandBlock,
  AuthEyebrow,
  AuthTitle,
  AuthBody,
  AuthStatGrid,
  AuthStatCard,
  LoginFormContent,
  FormWrapper,
  LoginBtn
} from '@/_components/layout/client/styled';

export default function Register() {
  const { setLoginUser } = useGlobalContext();

  const [last_name, setLastName] = useState('');
  const [first_name, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [successful, setSuccessful] = useState(false);
  const router = useRouter();

  const onChangePhone = (e) => {
    if (e && e.length > 12) {
      return false;
    } else if (e && validUSPhone(e)) {
      setPhone(e);
    } else {
      return false;
    }
  };
  const onSuccessGoogle = async (credentialResponse) => {
    const userInfo = jwtDecode(credentialResponse.credential);
    const data = await userService.login_with_google({
      email: userInfo.email,
      email_verified: userInfo.email_verified,
      family_name: userInfo.family_name,
      given_name: userInfo.given_name,
      is_doctor: 0
    });
    if (data.error !== undefined) {
      showToastErrorMsg(data.msg);
    } else {
      if (data.token) {
        setLoginUser({ isLoggedIn: true, user: data });
        setCookie(COOKIE_USER_KEY, JSON.stringify(data));
        showToastInfoMsg(MSG_PROMPT_LOGIN_COMPLETED);
        router.push('/home');
      }
    }
  };
  const onPatientSignUp = async () => {
    if (validateForm()) {
      setSuccessful(true);
      const { result, msg } = await userService.createUser(
        {first_name, last_name, phone, email, password});
      if (result === ERROR_SUCCESS) {
        showToastInfoMsg(msg);
      } else {
        showToastErrorMsg(msg);
      }
      setSuccessful(false);
    }
  };
  const validateForm = () => {
    if (!first_name) {
      showToastErrorMsg(MSG_PROMPT_FIRST_NAME);
      return false;
    }
    if (!last_name) {
      showToastErrorMsg(MSG_PROMPT_LAST_NAME);
      return false;
    }
    if (!email) {
      showToastErrorMsg(MSG_PROMPT_EMAIL_ADDRESS);
      return false;
    }
    if (!validEmail(email)) {
      showToastErrorMsg(MSG_PROMPT_VALID_EMAIL_ADDRESS);
      return false;
    }
    if (!phone) {
      showToastErrorMsg(MSG_PROMPT_USER_PHONE);
      return false;
    }
    if (!validUSPhone(phone)) {
      showToastErrorMsg(MSG_PROMPT_VALID_US_PHONE_NUMBER);
      return false;
    }
    if (!password) {
      showToastErrorMsg(MSG_PROMPT_EMAIL_PASSWORD);
      return false;
    }
    return true;
  };

  const divFormStyle = {
    marginBottom: -15
  };
  return (
    <ContentWrapper>
      <div className='container'>
        <AuthLayout>
          <ImgWrapper>
            <AuthBrandBlock>
              <AuthEyebrow>Team onboarding</AuthEyebrow>
              <AuthTitle>Set up a new workspace user with the same delivery-first brand.</AuthTitle>
              <AuthBody>Create access for new operators while keeping profile, resume, and outreach workflows inside the PeraGreemSolution environment.</AuthBody>
            </AuthBrandBlock>
            <AuthStatGrid>
              <AuthStatCard>
                <strong>Users</strong>
                <span>Controlled access by role and workflow responsibility</span>
              </AuthStatCard>
              <AuthStatCard>
                <strong>Profiles</strong>
                <span>Map new users to the profiles they need to operate</span>
              </AuthStatCard>
            </AuthStatGrid>
            <img src={loginBanner.src} className='img-fluid' alt='PeraGreemSolution workspace register' />
          </ImgWrapper>
          <LoginFormContent>
            <FormWrapper>
              <div style={{ width: '100%' }}>
                <div>
                  <h5>Create your account</h5>
                  <p>Join the workspace and start contributing to sourcing, resume operations, and client delivery.</p>
                </div>
                <div className={'row form-row'} style={divFormStyle}>
                  <div className={'form-group col-6'}>
                    <label htmlFor='first_name'>First Name</label>
                    <Input
                      type='text'
                      className='form-control'
                      name='first_name'
                      id={'first_name'}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                      }}
                    />
                  </div>
                  <div className={'form-group col-6'}>
                    <label htmlFor='last_name'>Last Name</label>
                    <Input
                      type='text'
                      className='form-control'
                      name='last_name'
                      id={'last_name'}
                      onChange={(e) => {
                        setLastName(e.target.value);
                      }}
                    />
                  </div>
                </div>
                <div className={'form-row'} style={divFormStyle}>
                  <div className='form-group col-12'>
                    <label htmlFor='email'>Email</label>
                    <Input
                      type='text'
                      className='form-control'
                      name='email'
                      id={'email'}
                      onChange={(e) => {
                        setEmail(e.target.value);
                      }}
                    />
                  </div>
                </div>
                <div className={'form-row'} style={divFormStyle}>
                  <div className='form-group col-12'>
                    <label htmlFor='phone'>Phone Number</label>
                    <PhoneInput className='form-control' name='phone' id='phone' value={phone} onChange={onChangePhone} />
                  </div>
                </div>
                <div className={'form-row'} style={divFormStyle}>
                  <div className='form-group col-12'>
                    <label htmlFor='password'>Create Password</label>
                    <Input
                      type='password'
                      className='form-control'
                      name='password'
                      id={'password'}
                      onChange={(e) => {
                        setPassword(e.target.value);
                      }}
                    />
                  </div>
                </div>
                <div
                  className={'text-center'}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    gap: 12,
                    alignItems: 'center',
                    paddingTop: 16,
                    flexWrap: 'wrap'
                  }}
                >
                  <LoginBtn onClick={onPatientSignUp} style={{ marginTop: 0, width: 180 }}>
                    Signup
                  </LoginBtn>

                  <GoogleOAuthProvider buttonText='Login with Google' clientId={GOOGLE_LOGIN_CLIENT_KEY} text='log in'>
                    <GoogleLogin
                      onSuccess={onSuccessGoogle}
                      text=''
                      shape='circle'
                      logo_alignment={'left'}
                      width={80}
                      locale={'en-US'}
                      clientId={GOOGLE_LOGIN_CLIENT_KEY}
                    />
                  </GoogleOAuthProvider>
                </div>
                <div className={'text-center dont-have'} style={{ marginTop: 24 }}>
                  Do you have an account?
                  <Link href='/login'> Login</Link>
                </div>
              </div>
            </FormWrapper>
          </LoginFormContent>
        </AuthLayout>
      </div>
    </ContentWrapper>
  );
}
